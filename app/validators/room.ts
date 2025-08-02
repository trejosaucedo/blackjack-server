import vine from '@vinejs/vine'

export const createRoomValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(3).maxLength(30),
  })
)

export const joinRoomValidator = vine.compile(
  vine.object({
    roomId: vine.string().uuid(),
  })
)
