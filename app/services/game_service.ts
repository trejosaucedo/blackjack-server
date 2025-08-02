import { GameRepository } from '#repositories/game_repository'
import { RoomRepository } from '#repositories/room_repository'
import { Ws } from '#utils/ws'
import { Card, RoundPlayerResponseDto, RoundResponseDto } from '#dtos/game'
import User from '#models/user'

type DecisionMap = Map<string, { [userId: string]: boolean }>

export class GameService {
  private repo = new GameRepository()
  private roomRepo = new RoomRepository()
  private static decisions: DecisionMap = new Map()

  // Crear un juego
  async createGame(roomId: string) {
    const game = await this.repo.createGame(roomId)
    console.log('[DEBUG][createGame] Nuevo juego creado:', game)
    return game
  }

  async startRound(gameId: string) {
    try {
      console.log('[DEBUG][startRound] INICIO - gameId:', gameId)

      const game = await this.repo.findGameById(gameId)
      if (!game) {
        console.error('[ERROR][startRound] Game no encontrado:', gameId)
        throw new Error('Game no encontrado')
      }

      Ws.io.to(game.roomId).emit('room:started', { gameId: game.id })
      Ws.io.to('lobby').emit('room:updated')
      Ws.io.to(game.roomId).emit('room:updated')
      console.log('[DEBUG][startRound] Game OK:', game.id)

      const room = await this.roomRepo.findRoomById(game.roomId)
      if (!room) {
        console.error('[ERROR][startRound] Room no encontrada:', game.roomId)
        throw new Error('Room no encontrada')
      }
      console.log('[DEBUG][startRound] Room OK:', room.id)

      const players = await this.roomRepo.getPlayersInRoom(room.id)
      if (!players?.length) {
        console.error('[ERROR][startRound] No hay jugadores en la room:', room.id)
        throw new Error('No hay jugadores en la room')
      }
      console.log(
        '[DEBUG][startRound] Players encontrados:',
        players.map((p) => `${p.userId}:${p.seatIndex}`)
      )

      const deck = this.shuffleDeck()
      console.log('[DEBUG][startRound] Deck shuffled:', Array.isArray(deck) ? deck.length : deck)
      const orderedPlayers = [...players].sort((a, b) => a.seatIndex - b.seatIndex)

      // Crear el round (deck serializado en createRound)
      const round = await this.repo.createRound(game.id, deck, orderedPlayers[0].seatIndex)
      console.log('[DEBUG][startRound] Round creado:', round?.id, round?.$isPersisted)

      // DESERIALIZAR deck antes de manipular
      let roundDeck = typeof round.deck === 'string' ? JSON.parse(round.deck) : round.deck

      // Reparte la primera carta
      for (const player of orderedPlayers) {
        const carta = roundDeck.shift()
        const cartas = [carta]
        const puntos = this.sumarPuntos(cartas)
        await this.repo.createRoundPlayer(
          round.id,
          player.userId,
          JSON.stringify(cartas), // Serializa aquí
          'jugando',
          puntos,
          false
        )
        console.log(`[DEBUG][startRound] 1ra carta para ${player.userId}:`, carta)
      }
      // Guarda deck actualizado
      round.deck = JSON.stringify(roundDeck)
      await round.save()
      console.log('[DEBUG][startRound] Round guardado después de la 1ra carta.')

      // Reparte la segunda carta
      for (const player of orderedPlayers) {
        const rp = await this.repo.findRoundPlayerByUser(round.id, player.userId)
        if (!rp) {
          console.error('[ERROR][startRound] No se encontró el round player:', player.userId)
          throw new Error('No se encontró el round player')
        }
        const carta = roundDeck.shift()
        let cartas = typeof rp.cartas === 'string' ? JSON.parse(rp.cartas) : rp.cartas
        cartas.push(carta)
        rp.cartas = JSON.stringify(cartas) // <-- Serializa aquí también
        rp.puntos = this.sumarPuntos(cartas)
        await rp.save()
        console.log(`[DEBUG][startRound] 2da carta para ${player.userId}:`, carta)
      }
      // Guarda deck actualizado
      round.deck = JSON.stringify(roundDeck)
      await round.save()
      console.log('[DEBUG][startRound] Round guardado después de la 2da carta.')

      // Revisar blackjacks y avanzar/terminar ronda si aplica
      await this.checkBlackjacksAndAdvance(round, game)
      console.log('[DEBUG][startRound] checkBlackjacksAndAdvance completado.')

      return round
    } catch (error) {
      console.error('[ERROR][startRound] Excepción:', error)
      throw error
    }
  }

  // Método para agregar hostId al GameResponseDto
  private async addHostIdToGame(game: any): Promise<any> {
    const room = await this.roomRepo.findRoomById(game.roomId) // Obtener la sala asociada
    if (!room) throw new Error('Room no encontrada')

    return {
      id: game.id,
      roomId: game.roomId,
      status: game.status,
      currentRound: game.currentRound,
      hostId: room.hostId,
    }
  }

  // Este método devolverá el GameResponseDto con el hostId incluido
  async getGameWithHostId(gameId: string): Promise<any> {
    const game = await this.repo.findGameById(gameId)
    if (!game) throw new Error('Game no encontrado')

    return this.addHostIdToGame(game)
  }

  // Otros métodos como shuffleDeck(), sumarPuntos(), etc. permanecen igual
  private shuffleDeck(): Card[] {
    const palos = ['corazones', 'picas', 'tréboles', 'diamantes']
    const valores = [
      { valor: 'A', valorNumerico: 1 },
      ...Array.from({ length: 9 }, (_, i) => ({ valor: `${i + 2}`, valorNumerico: i + 2 })),
      { valor: 'J', valorNumerico: 11 },
      { valor: 'Q', valorNumerico: 12 },
      { valor: 'K', valorNumerico: 13 },
    ]
    let deck: Card[] = []
    for (const palo of palos) {
      for (const v of valores) {
        deck.push({ ...v, palo })
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[deck[i], deck[j]] = [deck[j], deck[i]]
    }
    return deck
  }

  private sumarPuntos(cartas: Card[]) {
    let puntos = 0
    for (const c of cartas) {
      if (c.valor === 'A') {
        puntos += 1
      } else if (['J', 'Q', 'K'].includes(c.valor)) {
        puntos += c.valorNumerico
      } else {
        puntos += c.valorNumerico
      }
    }
    return puntos
  }

  // Checar blackjacks y avanzar/terminar ronda si aplica
  private async checkBlackjacksAndAdvance(round: any, game: any) {
    const roundPlayers = await this.repo.findRoundPlayers(round.id)
    const bjPlayers = roundPlayers.filter((rp) => {
      let cartas = typeof rp.cartas === 'string' ? JSON.parse(rp.cartas) : rp.cartas
      return cartas.length === 2 && this.sumarPuntos(cartas) === 21
    })

    if (bjPlayers.length > 0) {
      for (const rp of roundPlayers) {
        let cartas = typeof rp.cartas === 'string' ? JSON.parse(rp.cartas) : rp.cartas
        if (cartas.length === 2 && this.sumarPuntos(cartas) === 21) {
          rp.state = 'bj'
          rp.ganador = true
        } else {
          rp.state = 'plantado'
          rp.ganador = false
        }
        await rp.save()
      }
      round.status = 'ended'
      await round.save()
      Ws.io.to(game.id).emit('round:ended')
      return true
    }
    return false
  }

  private async advanceTurnOrFinishRound(round: any) {
    const roundPlayers = await this.repo.findRoundPlayers(round.id)
    const activos = roundPlayers.filter((rp) => rp.state === 'jugando')
    const game = await this.repo.findGameById(round.gameId)
    if (!game) throw new Error('Game no encontrado')
    if (activos.length === 0) {
      let max = 0
      for (const rp of roundPlayers) {
        if (rp.state !== 'bust' && rp.puntos > max && rp.puntos <= 21) {
          max = rp.puntos
        }
      }
      for (const rp of roundPlayers) {
        rp.ganador = rp.puntos === max && max > 0 && rp.state !== 'bust'
        await rp.save()
      }
      round.status = 'ended'
      await round.save()
      Ws.io.to(game.id).emit('round:ended')
      return
    }
    // Avanza turno (siguiente seatIndex "jugando")
    const roomPlayers = await this.roomRepo.getPlayersInRoom(game.roomId)
    const seatIndexesJugando = activos
      .map((rp) => {
        const foundRoomPlayer = roomPlayers.find((player) => player.userId === rp.userId)
        return foundRoomPlayer?.seatIndex ?? 0
      })
      .sort((a, b) => a - b)
    let next = null
    for (let i = 1; i <= seatIndexesJugando.length; i++) {
      const idx = (round.turnSeatIndex + i) % 7
      if (seatIndexesJugando.includes(idx)) {
        next = idx
        break
      }
    }
    if (next === null) {
      round.status = 'ended'
      await round.save()
      Ws.io.to(game.id).emit('round:ended')
      return
    }
    round.turnSeatIndex = next
    await round.save()
    Ws.io.to(game.id).emit('turn:next')
  }

  // Pedir carta (hit)
  async hit(gameId: string, userId: string) {
    const round = await this.repo.findCurrentRound(gameId)
    if (!round) throw new Error('No hay ronda en curso')
    const roundPlayer = await this.repo.findRoundPlayerByUser(round.id, userId)
    if (!roundPlayer || roundPlayer.state !== 'jugando') throw new Error('No puedes pedir carta')

    // Solo el jugador en turno
    const game = await this.repo.findGameById(gameId)
    if (!game) throw new Error('Game no encontrado')
    const roomPlayers = await this.roomRepo.getPlayersInRoom(game.roomId)
    const seatIndex = roomPlayers.find((p) => p.userId === userId)?.seatIndex
    if (seatIndex !== round.turnSeatIndex) throw new Error('No es tu turno')

    // Dar carta
    const carta = round.deck.shift()
    let cartas =
      typeof roundPlayer.cartas === 'string' ? JSON.parse(roundPlayer.cartas) : roundPlayer.cartas
    cartas.push(carta)
    roundPlayer.cartas = cartas
    roundPlayer.puntos = this.sumarPuntos(cartas)

    // ¿Bust, bj, plantado?
    if (roundPlayer.puntos > 21) {
      roundPlayer.state = 'bust'
    } else if (cartas.length === 2 && roundPlayer.puntos === 21) {
      roundPlayer.state = 'bj'
      roundPlayer.ganador = true
    } else if (roundPlayer.puntos === 21) {
      roundPlayer.state = 'plantado'
      roundPlayer.ganador = false
    }
    await roundPlayer.save()
    await round.save()
    await this.advanceTurnOrFinishRound(round)
  }

  // Plantarse (stand)
  async stand(gameId: string, userId: string) {
    const round = await this.repo.findCurrentRound(gameId)
    if (!round) throw new Error('No hay ronda en curso')
    const roundPlayer = await this.repo.findRoundPlayerByUser(round.id, userId)
    if (!roundPlayer || roundPlayer.state !== 'jugando') throw new Error('No puedes plantarte')

    // Solo el jugador en turno
    const game = await this.repo.findGameById(gameId)
    if (!game) throw new Error('Game no encontrado')
    const roomPlayers = await this.roomRepo.getPlayersInRoom(game.roomId)
    const seatIndex = roomPlayers.find((p) => p.userId === userId)?.seatIndex
    if (seatIndex !== round.turnSeatIndex) throw new Error('No es tu turno')

    roundPlayer.state = 'plantado'
    await roundPlayer.save()
    await this.advanceTurnOrFinishRound(round)
  }

  // Estado actual de la ronda/juego para cada usuario
  async getCurrent(gameId: string, userId: string): Promise<RoundResponseDto> {
    console.log('[DEBUG] getCurrent called with gameId:', gameId, 'and userId:', userId)
    const round = await this.repo.findCurrentRound(gameId)
    if (!round) throw new Error('No hay ronda en curso')
    const game = await this.repo.findGameById(gameId)
    if (!game) throw new Error('Game no encontrado')
    const room = await this.roomRepo.findRoomById(game.roomId)
    if (!room) throw new Error('Room no encontrada')
    const host = room.hostId === userId
    const roundPlayers = await this.repo.findRoundPlayers(round.id)

    const players: RoundPlayerResponseDto[] = []
    for (const rp of roundPlayers) {
      const user = await User.find(rp.userId)
      const nombre = user?.name || ''
      if (host || round.status === 'ended' || rp.userId === userId) {
        players.push({
          userId: rp.userId,
          cartas: typeof rp.cartas === 'string' ? JSON.parse(rp.cartas) : rp.cartas,
          state: rp.state,
          puntos: rp.puntos,
          ganador: rp.ganador,
          nombre,
        })
      } else {
        players.push({
          userId: rp.userId,
          cartas: [],
          state: rp.state,
          puntos: 0,
          ganador: false,
          nombre,
        })
      }
    }
    return {
      id: round.id,
      gameId: round.gameId,
      hostId: room.hostId,
      status: round.status,
      deckCount: round.deck.length,
      turnSeatIndex: round.turnSeatIndex,
      players,
    }
  }

  // Cancelar juego (si alguien se sale)
  async cancelGame(gameId: string) {
    const game = await this.repo.endGame(gameId)
    if (game) {
      Ws.io.to(game.id).emit('game:canceled')
    }
  }

  // Continuar ronda (confirmación de jugadores)
  async continueRound(gameId: string, userId: string, decision: boolean) {
    const game = await this.repo.findGameById(gameId)
    if (!game) throw new Error('Game no encontrado')

    if (!GameService.decisions.has(gameId)) {
      GameService.decisions.set(gameId, {})
    }
    const usersDecisions = GameService.decisions.get(gameId)!
    usersDecisions[userId] = decision

    // Room actual y todos los userIds de esa room
    const room = await this.roomRepo.findRoomById(game.roomId)
    if (!room) throw new Error('Room no encontrada')
    const roomPlayers = await this.roomRepo.getPlayersInRoom(room.id)
    const userIds = roomPlayers.map((p) => p.userId)
    const total = userIds.length

    // Si algún jugador puso "no", termina el juego y borra
    if (Object.values(usersDecisions).includes(false)) {
      game.status = 'ended'
      await game.save()
      GameService.decisions.delete(gameId)
      Ws.io.to(game.id).emit('game:ended')
      return 'ended'
    }

    // Si todos ya respondieron SÍ, inicia nueva ronda
    if (
      Object.keys(usersDecisions).length === total &&
      Object.values(usersDecisions).every(Boolean)
    ) {
      GameService.decisions.delete(gameId)
      await this.startRound(gameId)
      Ws.io.to(game.id).emit('round:started')
      return 'started'
    }

    // Faltan respuestas
    Ws.io.to(game.id).emit('continue:waiting')
    return 'waiting'
  }
}
