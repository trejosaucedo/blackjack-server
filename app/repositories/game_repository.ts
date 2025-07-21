import Game from '#models/game'

export class GameRepository {
  async create(data: {
    roomId: string
    currentSequence: { x: number; y: number; hex: string }[]
  }): Promise<Game> {
    return Game.create(data)
  }

  async findById(id: string): Promise<Game | null> {
    return Game.find(id)
  }

  async findByRoomId(roomId: string): Promise<Game | null> {
    return Game.query().where('room_id', roomId).first()
  }

  async finishGameWithWinner(gameId: string, winnerId: string): Promise<void> {
    const game = await Game.find(gameId)
    if (!game) throw new Error('Juego no encontrado')
    game.status = 'finished'
    game.winnerId = winnerId
    await game.save()
  }

  async appendColorToSequence(
    gameId: string,
    newColor: { x: number; y: number; hex: string }
  ): Promise<void> {
    const game = await Game.find(gameId)
    if (!game) throw new Error('Juego no encontrado')
    const seq = Array.isArray(game.currentSequence) ? game.currentSequence : []
    game.currentSequence = [...seq, newColor]
    await game.save()
  }
}
