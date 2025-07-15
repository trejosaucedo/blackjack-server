import vine from '@vinejs/vine'

export const createGameTurnValidator = vine.compile(
  vine.object({
    gameId: vine.string().uuid(),
    sequenceInput: vine.array(
      vine.object({
        x: vine.number().min(1),
        y: vine.number().min(1),
        hex: vine.string().regex(/^#[A-Fa-f0-9]{6}$/),
      })
    ),
  })
)
