import { io, Socket } from 'socket.io-client'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const NAMESPACE = '/chat'

let _socket: Socket | null = null

/**
 * Returns a singleton Socket.IO instance connected to the /chat namespace.
 * Authentication is handled by passing the JWT token retrieved from
 * localStorage in the `auth` handshake object.
 *
 * The socket is created with the websocket transport only — long-polling
 * is disabled to match the behaviour expected by ChatGateway.
 *
 * Callers must not call .disconnect() directly; instead rely on the
 * cleanup handled by useSocket.ts.
 */
export function getSocket(): Socket {
  if (_socket && _socket.connected) {
    return _socket
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  _socket = io(`${API_BASE_URL}${NAMESPACE}`, {
    auth: { token: token ?? '' },
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })

  return _socket
}

/**
 * Explicitly disconnects the singleton socket and clears the reference.
 * Exported so useSocket.ts can call it during cleanup.
 */
export function disconnectSocket(): void {
  if (_socket) {
    _socket.disconnect()
    _socket = null
  }
}
