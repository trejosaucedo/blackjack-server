import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'
const GameTurnController = () => import('#controllers/game_turn_controller')
const GameController = () => import('#controllers/game_controller')
const AuthController = () => import('#controllers/auth_controller')
const RoomController = () => import('#controllers/room_controller')

router.post('/register', [AuthController, 'register'])
router.post('/login', [AuthController, 'login'])

router
  .group(() => {
    router.post('/logout', [AuthController, 'logout'])
    router.get('/me', [AuthController, 'me'])
  })
  .use(middleware.auth())

router
  .group(() => {
    router.post('/rooms', [RoomController, 'create'])
    router.post('/rooms/:id/join', [RoomController, 'join'])
    router.get('/rooms', [RoomController, 'listWaiting'])
    router.get('/rooms/:id/status', [RoomController, 'status'])
    router.post('/rooms/:id/start', [RoomController, 'start'])
    router.post('/rooms/:id/leave', [RoomController, 'leave'])
    router.delete('/rooms/:id', [RoomController, 'cancel'])
  })
  .use(middleware.auth())

router
  .group(() => {
    router.get('/games/:id', [GameController, 'get'])
  })
  .use(middleware.auth())

router
  .group(() => {
    router.post('/game-turns', [GameTurnController, 'create'])
    router.get('/game-turns/game/:gameId', [GameTurnController, 'listByGame'])
    router.post('/game-turns/add', [GameTurnController, 'add'])
  })
  .use(middleware.auth())
