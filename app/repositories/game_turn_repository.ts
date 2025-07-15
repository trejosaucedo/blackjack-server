import GameTurn from '#models/game_turn'
import type { GameTurnCreateInternalDto } from '#dtos/game_turn'

export class GameTurnRepository {
  async findByGame(gameId: string): Promise<GameTurn[]> {
    return GameTurn.query().where('gameId', gameId).orderBy('turnNumber', 'asc').exec()
  }

  async create(
    data: GameTurnCreateInternalDto
  ): Promise<GameTurn> {
    return GameTurn.create(data)
  }

  async finishTurn(turnId: string): Promise<GameTurn | null> {
    const turn = await GameTurn.find(turnId)
    if (!turn) return null
    turn.isTurnFinished = true
    await turn.save()
    return turn
  }

  async findLastUnfinishedTurn(gameId: string, playerId: string): Promise<GameTurn | null> {
    return GameTurn.query()
      .where('gameId', gameId)
      .where('playerId', playerId)
      .where('isTurnFinished', false)
      .orderBy('turnNumber', 'desc')
      .first()
  }
}
