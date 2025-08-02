import Game from '#models/game'
import Round from '#models/round'
import RoundPlayer from '#models/round_player'

export class GameRepository {
  async createGame(roomId: string) {
    return Game.create({ roomId, status: 'in_progress' })
  }

  async findGameByRoomId(roomId: string) {
    return Game.query().where('room_id', roomId).where('status', 'in_progress').first()
  }

  async findGameById(gameId: string) {
    return Game.find(gameId)
  }

  async endGame(gameId: string) {
    const game = await this.findGameById(gameId)
    if (game) {
      game.status = 'ended'
      await game.save()
    }
    return game
  }

  async createRound(gameId: string, deck: any, turnSeatIndex: number) {
    console.debug('[DEBUG][createRound] Intentando crear ronda:', {
      gameId,
      deckType: typeof deck,
      deckPreview: Array.isArray(deck) ? deck.slice(0, 3) : deck,
      turnSeatIndex,
    })

    try {
      // Serializa si la columna es TEXT o si da problemas como ahora
      const deckSerialized = JSON.stringify(deck)
      const round = await Round.create({
        gameId,
        status: 'in_progress',
        deck: deckSerialized,
        turnSeatIndex,
      })

      console.debug('[DEBUG][createRound] Resultado de .create:', round)
      return round
    } catch (error) {
      console.error('[ERROR][createRound] Excepción lanzada:', error)
      throw new Error(
        `Error al crear la ronda: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async findCurrentRound(gameId: string) {
    let round = await Round.query()
      .where('game_id', gameId)
      .where('status', 'in_progress')
      .orderBy('created_at', 'desc')
      .first()

    // Si no hay ronda in_progress, trae la última
    if (!round) {
      round = await Round.query().where('game_id', gameId).orderBy('created_at', 'desc').first()
    }
    return round
  }

  async findRounds(gameId: string) {
    return Round.query().where('game_id', gameId)
  }

  // Round players
  async createRoundPlayer(
    roundId: string,
    userId: string,
    cartas: any,
    state: 'jugando' | 'plantado' | 'bust' | 'bj',
    puntos: number,
    ganador: boolean
  ) {
    return RoundPlayer.create({
      roundId,
      userId,
      cartas,
      state,
      puntos,
      ganador,
    })
  }

  async findRoundPlayers(roundId: string) {
    return RoundPlayer.query().where('round_id', roundId)
  }

  async findRoundPlayerByUser(roundId: string, userId: string) {
    return RoundPlayer.query().where('round_id', roundId).where('user_id', userId).first()
  }
}
