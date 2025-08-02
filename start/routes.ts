import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'
const GameController = () => import('#controllers/game_controller')
const RoomController = () => import('#controllers/room_controller')
const AuthController = () => import('#controllers/auth_controller')

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
    router.post('/rooms/create', [RoomController, 'create'])
    router.post('/rooms/join', [RoomController, 'join'])
    router.get('/rooms/available', [RoomController, 'available'])
    router.get('/rooms/current', [RoomController, 'current'])
    router.post('/rooms/start', [RoomController, 'start'])
    router.post('/rooms/leave', [RoomController, 'leave'])
    router.post('/rooms/delete', [RoomController, 'delete'])
  })
  .use(middleware.auth())

router
  .group(() => {
    router.post('/games/start', [GameController, 'start'])
    router.post('/games/hit', [GameController, 'hit'])
    router.post('/games/stand', [GameController, 'stand'])
    router.get('/games/current', [GameController, 'current'])
    router.post('/games/continue-round', [GameController, 'continueRound'])
    router.post('/games/cancel', [GameController, 'cancel'])
  })
  .use(middleware.auth())
