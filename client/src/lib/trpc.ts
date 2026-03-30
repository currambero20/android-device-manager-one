import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/appRouter";

export const trpc = createTRPCReact<AppRouter>();

export const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    // Si estamos en producción (Vercel), usamos la URL de Render
    if (
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1" &&
      !window.location.hostname.startsWith("192.168.")
    ) {
      return import.meta.env.VITE_API_URL || "https://android-device-manager-one-1.onrender.com/api/trpc";
    }
    
    // IMPORTANTE: En desarrollo local usamos rutas relativas /api/trpc 
    // para que el proxy de Vite (vite.config.ts) reenvíe la petición 
    // correctamente al backend y evite errores de CORS o respuestas HTML fallback
    return "/api/trpc";
  }
  
  // Fallback para SSR
  return import.meta.env.VITE_API_URL || "http://localhost:3001/api/trpc";
};
