import type { HttpContext } from '@adonisjs/core/http'
import { RoomService } from '#services/room_service'
import { ResponseHelper } from '#utils/response_helper'
import { createRoomValidator } from '#validators/room'

export default class RoomController {
  private service = new RoomService()

  async create({ request, response, user }: HttpContext) {
    if (!user) {
      return ResponseHelper.error(response, 'No autenticado', 401)
    }

    const payload = await request.validateUsing(createRoomValidator)

    if (payload.cantidadColores !== payload.colorsConfig.length) {
      return ResponseHelper.error(
        response,
        'La cantidad de colores debe coincidir con el tamaño de colorsConfig',
        400
      )
    }

    const room = await this.service.createRoom(payload, user.id)
    return ResponseHelper.success(response, 'Sala creada', room, 201)
  }

  async join({ request, response, user }: HttpContext) {
    if (!user) {
      return ResponseHelper.error(response, 'No autenticado', 401)
    }

    const roomId = request.param('id')
    if (!roomId) {
      return ResponseHelper.error(response, 'ID de sala requerido', 400)
    }

    const room = await this.service.joinRoom(roomId, user.id)
    if (!room) {
      return ResponseHelper.error(response, 'No se pudo unir a la sala', 400)
    }

    return ResponseHelper.success(response, 'Unido a la sala', room)
  }

  async listWaiting({ response }: HttpContext) {
    const rooms = await this.service.getWaitingRooms()
    return ResponseHelper.success(response, 'Salas disponibles', rooms)
  }

  async status({ params, response }: HttpContext) {
    const room = await this.service.getRoomStatus(params.id)
    if (!room) return ResponseHelper.error(response, 'Sala no encontrada', 404)
    return ResponseHelper.success(response, 'Estado de sala', room)
  }

  async start({ request, response, user }: HttpContext) {
    if (!user) {
      return ResponseHelper.error(response, 'No autenticado', 401)
    }

    const roomId = request.param('id')
    if (!roomId) {
      return ResponseHelper.error(response, 'ID de sala requerido', 400)
    }

    try {
      const room = await this.service.startRoom(roomId, user.id)
      if (!room) {
        return ResponseHelper.error(response, 'No se pudo iniciar la partida', 400)
      }
      return ResponseHelper.success(response, 'Partida iniciada', room)
    } catch (error) {
      const msg = (error as Error).message
      if (msg === 'La partida ya está iniciada o finalizada') {
        return ResponseHelper.error(response, msg, 409)
      }
      // Otros errores
      return ResponseHelper.error(response, msg, 400)
    }
  }
}
