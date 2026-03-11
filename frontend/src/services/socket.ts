import io, { Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
const sio = io(SOCKET_URL)

sio.on("connection", (socket) => {
    socket.on("join_session", ({ roomCode, role }) => {

    })
})

export default sio;