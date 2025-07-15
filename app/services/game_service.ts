import { GameRepository } from '#repositories/game_repository'
import type { CreateGameRequestDto, GameResponseDto } from '#dtos/game'
import Game from '#models/game'

export class GameService {
  private repo = new GameRepository()

  async createGame(data: CreateGameRequestDto): Promise<GameResponseDto> {
    const game = await this.repo.create(data)
    return this.toResponse(game)
  }

  async finishGame(gameId: string, winnerId: string): Promise<GameResponseDto | null> {
    const game = await this.repo.finishGame(gameId, winnerId)
    return game ? this.toResponse(game) : null
  }

  async getGame(gameId: string): Promise<GameResponseDto | null> {
    const game = await this.repo.findById(gameId)
    return game ? this.toResponse(game) : null
  }

  toResponse(game: Game): GameResponseDto {
    return {
      id: game.id,
      roomId: game.roomId,
      status: game.status,
      winnerId: game.winnerId,
      createdAt: game.createdAt.toISO() || '',
      updatedAt: game.updatedAt.toISO() || '',
    }
  }
}
