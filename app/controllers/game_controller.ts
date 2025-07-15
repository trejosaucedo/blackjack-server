import type { HttpContext } from '@adonisjs/core/http'
import { GameService } from '#services/game_service'
import { ResponseHelper } from '#utils/response_helper'

export default class GameController {
  private service = new GameService()

  async get({ params, response }: HttpContext) {
    const game = await this.service.getGame(params.id)
    if (!game) return ResponseHelper.error(response, 'Partida no encontrada', 404)
    return ResponseHelper.success(response, 'Estado de partida', game)
  }
}
