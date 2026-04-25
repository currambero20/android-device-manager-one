/**
 * Socket.io client singleton for ADM panel.
 * Connects to the Render backend (same origin via Vercel rewrites).
 * [FIX MOBILE] Mejor manejo de conexiones y reconnections
 */
import { io, Socket } from "socket.io-client";
import { getSocketUrl } from "./trpc";

const BACKEND_URL = (() => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    
    // Local development
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.")) {
      return `http://${hostname}:3001`;
    }
    
    // Production: Usar proxy de Vercel o URL directa
    const socketUrl = getSocketUrl();
    if (socketUrl) return socketUrl;
    
    // [FIX MOBILE] Para móviles usar el proxy de Vercel
    return "";
  }
  return "https://android-device-manager-one.onrender.com";
})();

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10, // [FIX MOBILE] Límite de reintentos para no colgar
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      withCredentials: true,
      path: "/socket.io/",
      // [FIX MOBILE] Timeout para evitar que móviles se cuelguen
      timeout: 20000,
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
    
    socketInstance.on("reconnect_attempt", (attemptNumber) => {
      console.log(`[ADM Socket] Reconnection attempt ${attemptNumber}`);
    });
    
    socketInstance.on("reconnect_failed", () => {
      console.error("[ADM Socket] Reconnection failed after max attempts");
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
