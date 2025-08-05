import { GameRepository } from '#repositories/game_repository'
import { RoomRepository } from '#repositories/room_repository'
import { Ws } from '#utils/ws'
import { Card, RoundPlayerResponseDto, RoundResponseDto } from '#dtos/game'
import User from '#models/user'

type DecisionMap = Map<string, { [userId: string]: boolean }>

export class GameService {
  private repo = new GameRepository()
  roomRepo = new RoomRepository()
  private static decisions: DecisionMap = new Map()

  // Crear un juego
  async createGame(roomId: string) {
    const game = await this.repo.createGame(roomId)
    return game
  }

  async startRound(gameId: string) {
    const game = await this.repo.findGameById(gameId)
    if (!game) throw new Error('Game no encontrado')

    const room = await this.roomRepo.findRoomById(game.roomId)
    if (!room) throw new Error('Room no encontrada')

    // Cambiar status a 'in_progress' si no lo está
    if (room.status !== 'in_game') {
      room.status = 'in_game'
      await room.save()
    }

    game.status = 'in_progress'
    await game.save()

    Ws.io.to(game.roomId).emit('room:started', { gameId: game.id })
    Ws.io.to('lobby').emit('room:updated')
    Ws.io.to(game.roomId).emit('room:updated')

    const players = await this.roomRepo.getPlayersInRoom(room.id)
    if (!players?.length) throw new Error('No hay jugadores en la room')

    const deck = this.shuffleDeck()
    const orderedPlayers = [...players].sort((a, b) => a.seatIndex - b.seatIndex)
    const round = await this.repo.createRound(game.id, deck, orderedPlayers[0].seatIndex)
    let roundDeck = typeof round.deck === 'string' ? JSON.parse(round.deck) : round.deck

    for (const player of orderedPlayers) {
      const carta = roundDeck.shift()
      const cartas = [carta]
      const puntos = this.sumarPuntos(cartas)
      await this.repo.createRoundPlayer(
        round.id,
        player.userId,
        JSON.stringify(cartas),
        'jugando',
        puntos,
        false
      )
    }
    round.deck = JSON.stringify(roundDeck)
    await round.save()

    for (const player of orderedPlayers) {
      const rp = await this.repo.findRoundPlayerByUser(round.id, player.userId)
      if (!rp) throw new Error('No se encontró el round player')
      const carta = roundDeck.shift()
      let cartas = typeof rp.cartas === 'string' ? JSON.parse(rp.cartas) : rp.cartas
      cartas.push(carta)
      const puntos = this.sumarPuntos(cartas)
      rp.cartas = JSON.stringify(cartas)

      if (cartas.length === 2 && puntos === 21) {
        rp.state = 'bj'
        rp.ganador = true
      } else if (puntos > 21) {
        rp.state = 'bust'
        rp.ganador = false
      } else {
        rp.state = 'jugando'
        rp.ganador = false
      }
      rp.puntos = puntos
      await rp.save()
    }
    round.deck = JSON.stringify(roundDeck)
    await round.save()

    await this.advanceTurnIfCurrentIsInvalid(round)
    await this.checkBlackjacksAndAdvance(round, game)
    return round
  }

  private async advanceTurnIfCurrentIsInvalid(round: any) {
    const roundPlayers = await this.repo.findRoundPlayers(round.id)
    let count = 0
    while (roundPlayers[round.turnSeatIndex]?.state !== 'jugando' && count < roundPlayers.length) {
      round.turnSeatIndex = (round.turnSeatIndex + 1) % roundPlayers.length
      count++
    }
    const algunoJugando = roundPlayers.some((p) => p.state === 'jugando')
    if (!algunoJugando) {
      // FIN DE RONDA: Round queda en ended, Game pasa a between_rounds
      round.status = 'ended'
      await round.save()
      const game = await this.repo.findGameById(round.gameId)
      if (game) {
        game.status = 'between_rounds'
        await game.save()
        Ws.io.to(game.id).emit('round:ended')
      }
      return
    }
    await round.save()
  }

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
      game.status = 'between_rounds'
      await game.save()
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
      game.status = 'between_rounds'
      await game.save()
      Ws.io.to(game.id).emit('round:ended')
      return
    }
    const roomPlayers = await this.roomRepo.getPlayersInRoom(game.roomId)
    const seatIndexesJugando = activos
      .map((rp) => {
        const foundRoomPlayer = roomPlayers.find((player) => player.userId === rp.userId)
        return foundRoomPlayer?.seatIndex ?? 0
      })
      .sort((a, b) => a - b)
    let next = null
    for (let i = 1; i <= seatIndexesJugando.length; i++) {
      const idx = (round.turnSeatIndex + i) % roomPlayers.length
      if (seatIndexesJugando.includes(idx)) {
        next = idx
        break
      }
    }
    if (next === null) {
      round.status = 'ended'
      await round.save()
      game.status = 'between_rounds'
      await game.save()
      Ws.io.to(game.id).emit('round:ended')
      return
    }
    round.turnSeatIndex = next
    await round.save()
    Ws.io.to(game.id).emit('turn:next')
  }

  async hit(gameId: string, userId: string) {
    const round = await this.repo.findCurrentRound(gameId)
    if (!round) throw new Error('No hay ronda en curso')

    const roundPlayer = await this.repo.findRoundPlayerByUser(round.id, userId)
    if (!roundPlayer || roundPlayer.state !== 'jugando') throw new Error('No puedes pedir carta')

    const game = await this.repo.findGameById(gameId)
    if (!game) throw new Error('Game no encontrado')

    const roomPlayers = await this.roomRepo.getPlayersInRoom(game.roomId)
    const seatIndex = roomPlayers.find((p) => p.userId === userId)?.seatIndex

    if (seatIndex !== round.turnSeatIndex) {
      throw new Error('No es tu turno')
    }

    let deck = typeof round.deck === 'string' ? JSON.parse(round.deck) : round.deck
    const carta = deck.shift()
    let cartas =
      typeof roundPlayer.cartas === 'string' ? JSON.parse(roundPlayer.cartas) : roundPlayer.cartas
    cartas.push(carta)
    roundPlayer.cartas = JSON.stringify(cartas)
    roundPlayer.puntos = this.sumarPuntos(cartas)

    if (roundPlayer.puntos > 21) {
      roundPlayer.state = 'bust'
      await roundPlayer.save()
      round.deck = JSON.stringify(deck)
      await round.save()
      await this.advanceTurnOrFinishRound(round)
      return
    }
    if (cartas.length === 2 && roundPlayer.puntos === 21) {
      roundPlayer.state = 'bj'
      roundPlayer.ganador = true
      await roundPlayer.save()
      round.deck = JSON.stringify(deck)
      await round.save()
      await this.advanceTurnOrFinishRound(round)
      return
    }
    if (roundPlayer.puntos === 21) {
      roundPlayer.state = 'plantado'
      await roundPlayer.save()
      round.deck = JSON.stringify(deck)
      await round.save()
      await this.advanceTurnOrFinishRound(round)
      return
    }
    await roundPlayer.save()
    round.deck = JSON.stringify(deck)
    await round.save()

    Ws.io.to(game.id).emit('turn:next')
  }

  async stand(gameId: string, userId: string) {
    const round = await this.repo.findCurrentRound(gameId)
    if (!round) throw new Error('No hay ronda en curso')
    const roundPlayer = await this.repo.findRoundPlayerByUser(round.id, userId)
    if (!roundPlayer || roundPlayer.state !== 'jugando') throw new Error('No puedes plantarte')

    const game = await this.repo.findGameById(gameId)
    if (!game) throw new Error('Game no encontrado')
    const roomPlayers = await this.roomRepo.getPlayersInRoom(game.roomId)
    const seatIndex = roomPlayers.find((p) => p.userId === userId)?.seatIndex
    if (seatIndex !== round.turnSeatIndex) throw new Error('No es tu turno')

    roundPlayer.state = 'plantado'
    await roundPlayer.save()
    await this.advanceTurnOrFinishRound(round)
  }

  private shuffleDeck(): Card[] {
    const palos = ['corazones', 'picas', 'treboles', 'diamantes']
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

  private async addHostIdToGame(game: any): Promise<any> {
    const room = await this.roomRepo.findRoomById(game.roomId)
    if (!room) throw new Error('Room no encontrada')

    return {
      id: game.id,
      roomId: game.roomId,
      status: game.status,
      currentRound: game.currentRound,
      hostId: room.hostId,
    }
  }

  async getGameWithHostId(gameId: string): Promise<any> {
    const game = await this.repo.findGameById(gameId)
    if (!game) throw new Error('Game no encontrado')

    return this.addHostIdToGame(game)
  }

  async getCurrent(gameId: string, userId: string): Promise<RoundResponseDto> {
    const round = await this.repo.findCurrentRound(gameId)
    if (!round) throw new Error('No hay ronda en curso')
    const game = await this.repo.findGameById(gameId)
    if (!game) throw new Error('Game no encontrado')
    const room = await this.roomRepo.findRoomById(game.roomId)
    if (!room) throw new Error('Room no encontrada')
    const host = room.hostId === userId
    const roundPlayers = await this.repo.findRoundPlayers(round.id)
    const roomPlayers = await this.roomRepo.getPlayersInRoom(room.id)

    const players: RoundPlayerResponseDto[] = []
    for (const rp of roundPlayers) {
      const user = await User.find(rp.userId)
      const nombre = user?.name || ''
      const realCartas = typeof rp.cartas === 'string' ? JSON.parse(rp.cartas) : rp.cartas

      if (host || round.status === 'ended' || rp.userId === userId) {
        players.push({
          userId: rp.userId,
          cartas: realCartas,
          state: rp.state,
          puntos: rp.puntos,
          ganador: rp.ganador,
          nombre,
        })
      } else {
        players.push({
          userId: rp.userId,
          cartas: Array(realCartas.length).fill(null),
          state: rp.state,
          puntos: 0,
          ganador: false,
          nombre,
        })
      }
    }
    players.sort((a, b) => {
      const aSeat = roomPlayers.find((rp) => rp.userId === a.userId)?.seatIndex ?? 0
      const bSeat = roomPlayers.find((rp) => rp.userId === b.userId)?.seatIndex ?? 0
      return aSeat - bSeat
    })

    // AQUÍ VA LA CLAVE: devolver el estado actual del juego también
    return {
      id: round.id,
      gameId: round.gameId,
      hostId: room.hostId,
      status: round.status, // Estado de la ronda actual
      deckCount: round.deck.length,
      turnSeatIndex: round.turnSeatIndex,
      players,
      decisions: GameService.decisions.get(gameId) || {},
      gameStatus: game.status, // Estado del juego completo
    }
  }


  async cancelGame(gameId: string) {
    const game = await this.repo.endGame(gameId)
    if (game) {
      Ws.io.to(game.id).emit('game:canceled')
    }
  }

  /**
   * Espera la decisión de todos los jugadores para continuar la ronda o terminar el juego.
   * - Si alguien dice NO, termina el juego (`ended`)
   * - Si todos dicen SÍ, inicia nueva ronda (`in_progress`)
   * - Si faltan votos, deja el juego en estado `between_rounds`
   */
  async continueRound(gameId: string, userId: string, decision: boolean) {
    const game = await this.repo.findGameById(gameId)
    if (!game) throw new Error('Game no encontrado')

    if (!GameService.decisions.has(gameId)) {
      GameService.decisions.set(gameId, {})
    }
    const usersDecisions = GameService.decisions.get(gameId)!
    usersDecisions[userId] = decision

    const room = await this.roomRepo.findRoomById(game.roomId)
    if (!room) throw new Error('Room no encontrada')
    const roomPlayers = await this.roomRepo.getPlayersInRoom(room.id)
    const total = roomPlayers.length

    // -- Si alguien dice NO: termina el juego
    if (Object.values(usersDecisions).includes(false)) {
      game.status = 'ended'
      await game.save()
      GameService.decisions.delete(gameId)
      Ws.io.to(game.id).emit('game:ended')
      return 'ended'
    }

    // -- Si todos dicen SÍ: inicia nueva ronda
    if (
      Object.keys(usersDecisions).length === total &&
      Object.values(usersDecisions).every(Boolean)
    ) {
      GameService.decisions.delete(gameId)
      await this.startRound(gameId)
      game.status = 'in_progress'
      await game.save()
      Ws.io.to(game.id).emit('round:started')
      return 'started'
    }

    // -- Faltan votos: deja el juego en estado entre rondas
    game.status = 'between_rounds'
    await game.save()
    Ws.io.to(game.id).emit('continue:waiting')
    return 'waiting'
  }
}
