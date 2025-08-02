import type { HttpContext } from '@adonisjs/core/http'
import { RoomService } from '#services/room_service'
import { createRoomValidator, joinRoomValidator } from '#validators/room'
import { ResponseHelper } from '#utils/response_helper'

export default class RoomController {
  private service = new RoomService()

  async create({ request, response, user }: HttpContext) {
    try {
      const payload = await request.validateUsing(createRoomValidator)
      const room = await this.service.create(payload, user!.id)
      return ResponseHelper.success(response, 'Sala creada', room, 201)
    } catch (error) {
      return ResponseHelper.error(response, 'Error al crear sala', 400, error)
    }
  }

  async join({ request, response, user }: HttpContext) {
    try {
      const payload = await request.validateUsing(joinRoomValidator)
      const room = await this.service.join(payload, user!.id)
      return ResponseHelper.success(response, 'Te uniste a la sala', room)
    } catch (error) {
      return ResponseHelper.error(response, 'No se pudo unir a la sala', 400, error)
    }
  }

  async available({ response }: HttpContext) {
    try {
      const rooms = await this.service.available()
      return ResponseHelper.success(response, 'Salas disponibles', rooms)
    } catch (error) {
      return ResponseHelper.error(response, 'Error al listar salas', 400, error)
    }
  }

  async current({ request, response }: HttpContext) {
    try {
      const roomId = request.input('roomId')
      const room = await this.service.current(roomId)
      return ResponseHelper.success(response, 'Sala actual', room)
    } catch (error) {
      return ResponseHelper.error(response, 'Error al obtener la sala', 400, error)
    }
  }

  async start({ request, response, user }: HttpContext) {
    try {
      const roomId = request.input('roomId')
      const gameId = await this.service.start(roomId, user!.id)
      return ResponseHelper.success(response, 'Partida iniciada', { gameId })
    } catch (error) {
      return ResponseHelper.error(response, 'No se pudo iniciar la partida', 400, error)
    }
  }


  async leave({ request, response, user }: HttpContext) {
    try {
      const roomId = request.input('roomId')
      await this.service.leave(roomId, user!.id)
      return ResponseHelper.success(response, 'Saliste de la sala')
    } catch (error) {
      return ResponseHelper.error(response, 'No se pudo salir de la sala', 400, error)
    }
  }

  async delete({ request, response, user }: HttpContext) {
    try {
      const roomId = request.input('roomId')
      await this.service.delete(roomId, user!.id)
      return ResponseHelper.success(response, 'Sala eliminada')
    } catch (error) {
      return ResponseHelper.error(response, 'No se pudo eliminar la sala', 400, error)
    }
  }
}
