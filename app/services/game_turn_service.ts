import { GameTurnRepository } from '#repositories/game_turn_repository'
import type { CreateGameTurnRequestDto, GameTurnResponseDto } from '#dtos/game_turn'
import { GameRepository } from '#repositories/game_repository'
import { RoomRepository } from '#repositories/room_repository'

export class GameTurnService {
  private turnRepo = new GameTurnRepository()
  private gameRepo = new GameRepository()
  private roomRepo = new RoomRepository()

  async createTurn(data: CreateGameTurnRequestDto, playerId: string): Promise<GameTurnResponseDto> {
    const previousTurns = await this.turnRepo.findByGame(data.gameId)
    const lastSequence =
      previousTurns.length > 0 ? previousTurns[previousTurns.length - 1].sequenceInput : []

    const inputSequenceWithoutLast = data.sequenceInput.slice(0, -1)
    const isCorrect = this.compareSequences(lastSequence, inputSequenceWithoutLast)

    if (!isCorrect) {
      const winnerId = await this.getOpponentPlayerId(playerId, data.gameId)
      await this.gameRepo.finishGameWithWinner(data.gameId, winnerId)
    }

    const turnNumber = previousTurns.length + 1

    const turn = await this.turnRepo.create({
      ...data,
      playerId,
      turnNumber,
      isCorrect,
      isTurnFinished: false,
    })

    return this.toResponse(turn)
  }

  async finishTurn(turnId: string): Promise<GameTurnResponseDto | null> {
    const turn = await this.turnRepo.finishTurn(turnId)
    return turn ? this.toResponse(turn) : null
  }

  async addColorToSequence(
    gameId: string,
    playerId: string,
    newColor: { x: number; y: number; hex: string }
  ): Promise<void> {
    const myUnfinishedTurn = await this.turnRepo.findLastUnfinishedTurn(gameId, playerId)
    if (!myUnfinishedTurn) {
      throw new Error('No tienes un turno pendiente por finalizar, no puedes agregar un color')
    }

    const game = await this.gameRepo.findById(gameId)
    if (!game) throw new Error('Juego no encontrado')

    const room = await this.roomRepo.findById(game.roomId)
    if (!room) throw new Error('Sala no encontrada')

    // Validar que el color esté en colorsConfig de la sala
    const exists = room.colorsConfig.some(
      (c) => c.x === newColor.x && c.y === newColor.y && c.hex === newColor.hex
    )
    if (!exists) {
      throw new Error('El color no esta en la configuración de la sala')
    }

    await this.gameRepo.appendColorToSequence(gameId, newColor)
    myUnfinishedTurn.isTurnFinished = true
    await myUnfinishedTurn.save()
  }

  async getTurnsByGame(gameId: string): Promise<GameTurnResponseDto[]> {
    const turns = await this.turnRepo.findByGame(gameId)
    return turns.map(this.toResponse)
  }

  private compareSequences(
    seqA: { x: number; y: number; hex: string }[],
    seqB: { x: number; y: number; hex: string }[]
  ): boolean {
    if (seqA.length !== seqB.length) return false
    for (const [i, element] of seqA.entries()) {
      if (element.x !== seqB[i].x || element.y !== seqB[i].y || element.hex !== seqB[i].hex) {
        return false
      }
    }
    return true
  }

  private async getOpponentPlayerId(currentPlayerId: string, gameId: string): Promise<string> {
    const game = await this.gameRepo.findById(gameId)
    if (!game) throw new Error('Juego no encontrado')
    const room = await this.roomRepo.findById(game.roomId)
    if (!room) throw new Error('Sala no encontrada')
    return room.hostPlayerId === currentPlayerId ? room.secondPlayerId! : room.hostPlayerId
  }

  toResponse(turn: any): GameTurnResponseDto {
    return {
      id: turn.id,
      gameId: turn.gameId,
      playerId: turn.playerId,
      turnNumber: turn.turnNumber,
      sequenceInput: turn.sequenceInput,
      isCorrect: turn.isCorrect,
      isTurnFinished: turn.isTurnFinished,
      createdAt: turn.createdAt.toISO() || '',
    }
  }
}
