import vine from '@vinejs/vine'

export const startGameValidator = vine.compile(
  vine.object({
    roomId: vine.string().uuid(),
  })
)

export const hitValidator = vine.compile(
  vine.object({
    gameId: vine.string().uuid(),
  })
)

export const standValidator = vine.compile(
  vine.object({
    gameId: vine.string().uuid(),
  })
)

export const continueRoundValidator = vine.compile(
  vine.object({
    gameId: vine.string().uuid(),
    decision: vine.boolean(),
  })
)
