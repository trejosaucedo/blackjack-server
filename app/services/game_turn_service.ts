import { GameTurnRepository } from '#repositories/game_turn_repository'
import type { CreateGameTurnRequestDto, GameTurnResponseDto } from '#dtos/game_turn'
import { GameRepository } from '#repositories/game_repository'
import { RoomRepository } from '#repositories/room_repository'
import Game from '#models/game'

export class GameTurnService {
  private turnRepo = new GameTurnRepository()
  private gameRepo = new GameRepository()
  private roomRepo = new RoomRepository()

  async createTurn(data: CreateGameTurnRequestDto, playerId: string): Promise<GameTurnResponseDto> {
    // 1. Obtener los turnos previos y la secuencia previa
    const previousTurns = await this.turnRepo.findByGame(data.gameId)
    const lastSequence =
      previousTurns.length > 0 ? previousTurns[previousTurns.length - 1].sequenceInput : []

    // 2. Validar input:
    //    - Debe tener longitud exacta = secuencia previa + 1
    //    - Los primeros N colores deben coincidir exactamente
    const input = data.sequenceInput
    const expected = lastSequence

    const isLengthOk = input.length === expected.length + 1
    const isSameSoFar = expected.every(
      (c, i) => c.x === input[i].x && c.y === input[i].y && c.hex === input[i].hex
    )

    const isCorrect = isLengthOk && isSameSoFar

    // 3. Si es incorrecto, declarar ganador al oponente
    if (!isCorrect) {
      const winnerId = await this.getOpponentPlayerId(playerId, data.gameId)
      await this.gameRepo.finishGameWithWinner(data.gameId, winnerId)
    }

    // 4. Crear el turno (isTurnFinished=false; se finalizará al agregar color)
    const turnNumber = previousTurns.length + 1
    const turn = await this.turnRepo.create({
      ...data,
      playerId,
      turnNumber,
      isCorrect,
      isTurnFinished: false,
    })

    // 5. Devolver DTO con currentSequence
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
    return Promise.all(turns.map((turn) => this.toResponse(turn)))
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

  async toResponse(turn: any): Promise<GameTurnResponseDto> {
    const game = await Game.find(turn.gameId)
    return {
      id: turn.id,
      gameId: turn.gameId,
      playerId: turn.playerId,
      turnNumber: turn.turnNumber,
      sequenceInput: turn.sequenceInput,
      isCorrect: turn.isCorrect,
      isTurnFinished: turn.isTurnFinished,
      createdAt: turn.createdAt.toISO() || '',
      currentSequence: game?.currentSequence ?? [],
    }
  }
}
