import type { HttpContext } from '@adonisjs/core/http'
import { GameService } from '#services/game_service'
import {
  startGameValidator,
  hitValidator,
  standValidator,
  continueRoundValidator,
} from '#validators/game'
import { ResponseHelper } from '#utils/response_helper'

export default class GameController {
  private service = new GameService()

  async start({ request, response }: HttpContext) {
    try {
      console.log('creando partida desde controller start')
      const payload = await request.validateUsing(startGameValidator)
      const game = await this.service.createGame(payload.roomId)
      await this.service.startRound(game.id)
      return ResponseHelper.success(response, 'Partida iniciada', { gameId: game.id })
    } catch (error) {
      return ResponseHelper.error(response, 'No se pudo iniciar la partida', 400, error)
    }
  }

  async hit({ request, response, user }: HttpContext) {
    try {
      const payload = await request.validateUsing(hitValidator)
      await this.service.hit(payload.gameId, user!.id)
      return ResponseHelper.success(response, 'Carta pedida')
    } catch (error) {
      return ResponseHelper.error(response, 'No se pudo pedir carta', 400, error)
    }
  }

  async stand({ request, response, user }: HttpContext) {
    try {
      const payload = await request.validateUsing(standValidator)
      await this.service.stand(payload.gameId, user!.id)
      return ResponseHelper.success(response, 'Te plantaste')
    } catch (error) {
      return ResponseHelper.error(response, 'No se pudo plantar', 400, error)
    }
  }

  async current({ request, response, user }: HttpContext) {
    try {
      const payload = await request.validateUsing(hitValidator, { data: request.qs() })
      const round = await this.service.getCurrent(payload.gameId, user!.id)
      return ResponseHelper.success(response, 'Estado actual', round)
    } catch (error) {
      console.error('[DEBUG getCurrent ERROR]', error)
      return ResponseHelper.error(response, 'Error al obtener el estado', 400, error)
    }
  }

  async continueRound({ request, response, user }: HttpContext) {
    try {
      const payload = await request.validateUsing(continueRoundValidator)
      const result = await this.service.continueRound(payload.gameId, user!.id, !!payload.decision)
      return ResponseHelper.success(response, 'Decisión registrada', result)
    } catch (error) {
      return ResponseHelper.error(response, 'Error al continuar ronda', 400, error)
    }
  }

  async cancel({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(hitValidator)
      await this.service.cancelGame(payload.gameId)
      return ResponseHelper.success(response, 'Juego cancelado')
    } catch (error) {
      return ResponseHelper.error(response, 'Error al cancelar juego', 400, error)
    }
  }
}
