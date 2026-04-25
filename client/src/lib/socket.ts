/**
 * Socket.io client singleton for ADM panel.
 * Connects to the Render backend (same origin via Vercel rewrites).
 */
import { io, Socket } from "socket.io-client";

const BACKEND_URL =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1")
    ? `http://${window.location.hostname}:3001`
    : "https://android-device-manager-one.onrender.com";

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      withCredentials: true,
      path: "/socket.io/",
    });

    socketInstance.on("connect", () => {
      console.log("[ADM Socket] Connected →", socketInstance?.id);
    });

    socketInstance.on("disconnect", (reason) => {
      console.warn("[ADM Socket] Disconnected:", reason);
    });

    socketInstance.on("connect_error", (err) => {
      console.error("[ADM Socket] Connection error:", err.message);
    });
  }

  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

export default getSocket;
