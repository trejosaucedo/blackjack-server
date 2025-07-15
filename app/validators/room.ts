import vine from '@vinejs/vine'

export const createRoomValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(2),
    colorsConfig: vine.array(
      vine.object({
        x: vine.number().min(1),
        y: vine.number().min(1),
        hex: vine.string().regex(/^#[A-Fa-f0-9]{6}$/),
      })
    ),
    cantidadColores: vine.number().min(2).max(16),
  })
)
