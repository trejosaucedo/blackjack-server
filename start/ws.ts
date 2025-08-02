import app from '@adonisjs/core/services/app'
import { Server as SocketIOServer } from 'socket.io'
import server from '@adonisjs/core/services/server'

let io: SocketIOServer | null = null

app.ready(() => {
  io = new SocketIOServer(server.getNodeServer(), {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  })

  io.on('connection', (socket) => {
    socket.on('joinChannel', (channelName) => {
      socket.join(channelName)
      console.log(`Socket ${socket.id} joined channel: ${channelName}`)
    })
    socket.on('leaveChannel', (channelName) => {
      socket.leave(channelName)
      console.log(`Socket ${socket.id} left channel: ${channelName}`)
    })
  })
})

export function getIo() {
  if (!io) throw new Error('Socket.IO no inicializado')
  return io
}
