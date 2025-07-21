import Room from '#models/room'
import { CreateGameRequestDto, GameResponseDto } from '#dtos/game'
import { GameRepository } from '#repositories/game_repository'
import Game from '#models/game'

export class GameService {
  private repo = new GameRepository()

  async createGame(data: CreateGameRequestDto): Promise<GameResponseDto> {
    const game = await this.repo.create(data)
    return this.toResponse(game)
  }

  async getGame(gameId: string): Promise<GameResponseDto | null> {
    const game = await this.repo.findById(gameId)
    if (!game) return null
    return this.toResponse(game)
  }

  // --- AHORA ASYNC ---
  async toResponse(game: Game): Promise<GameResponseDto> {
    const room = await Room.query()
      .where('id', game.roomId)
      .preload('hostPlayer')
      .preload('secondPlayer')
      .firstOrFail()

    return {
      id: game.id,
      room: {
        id: room.id,
        name: room.name,
        hostPlayerId: room.hostPlayerId,
        hostPlayerName: room.hostPlayer?.name ?? '',
        secondPlayerId: room.secondPlayerId,
        secondPlayerName: room.secondPlayer?.name ?? '',
        status: room.status,
        colorsConfig: room.colorsConfig,
        cantidadColores: room.cantidadColores,
        createdAt: room.createdAt.toISO() ?? '',
        updatedAt: room.updatedAt.toISO() ?? '',
      },
      status: game.status,
      winnerId: game.winnerId,
      currentSequence: game.currentSequence ?? [],
      createdAt: game.createdAt.toISO() ?? '',
      updatedAt: game.updatedAt.toISO() ?? '',
    }
  }
}
