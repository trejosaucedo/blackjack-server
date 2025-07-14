import router from '@adonisjs/core/services/router'
const AuthController = () => import('#controllers/auth_controller')
import { middleware } from './kernel.js'

router.post('/register', [AuthController, 'register'])
router.post('/login', [AuthController, 'login'])

router
  .group(() => {
    router.post('/logout', [AuthController, 'logout'])
    router.get('/me', [AuthController, 'me'])
  })
  .use(middleware.auth())
