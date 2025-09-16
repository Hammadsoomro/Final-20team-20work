import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(userId: string) {
  if (socket && socket.connected) return socket;
  if (socket) {
    try {
      socket.disconnect();
    } catch {}
    socket = null;
  }
  socket = io("", {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    query: { userId },
    autoConnect: true,
  });
  return socket;
}
