import type { HttpContext } from '@adonisjs/core/http'
import { GameTurnService } from '#services/game_turn_service'
import { ResponseHelper } from '#utils/response_helper'
import { createGameTurnValidator } from '#validators/game_turn'

export default class GameTurnController {
  private service = new GameTurnService()

  async create({ request, response, user }: HttpContext) {
    if (!user) {
      return ResponseHelper.error(response, 'No autenticado', 401)
    }
    const payload = await request.validateUsing(createGameTurnValidator)
    const payloadWithPlayer = {
      ...payload,
      playerId: user.id,
    }
    const turn = await this.service.createTurn(payloadWithPlayer)
    return ResponseHelper.success(response, 'Turno registrado', turn, 201)
  }

  async add({ request, response, user }: HttpContext) {
    if (!user) {
      return ResponseHelper.error(response, 'No autenticado', 401)
    }
    const { gameId, sequenceInput } = request.only(['gameId', 'sequenceInput'])
    if (!Array.isArray(sequenceInput) || sequenceInput.length !== 1) {
      return ResponseHelper.error(response, 'Debes enviar exactamente un color nuevo', 400)
    }
    await this.service.addColorToSequence(gameId, user.id, sequenceInput[0])
    return ResponseHelper.success(response, 'Color agregado a la secuencia')
  }

  async listByGame({ params, response }: HttpContext) {
    const turns = await this.service.getTurnsByGame(params.gameId)
    return ResponseHelper.success(response, 'Historial de turnos', turns)
  }
}
