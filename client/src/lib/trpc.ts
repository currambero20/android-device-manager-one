import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/appRouter";

export const trpc = createTRPCReact<AppRouter>();

// Render backend URL - Production
const RENDER_BACKEND_URL = "https://android-device-manager-one.onrender.com"; // Backend en Render

// Fallback - si el anterior no funciona, usar este
const RENDER_BACKEND_FALLBACK = "http://localhost:3001";

export const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    
    // Local development
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.")) {
       return `http://${hostname}:3001/api/trpc`;
    }

    // Production: Usar ruta relativa para aprovechar el proxy de Vercel
    // [FIX MOBILE] Esto asegura que las cookies se compartan correctamente
    return "/api/trpc";
  }

  // SSR or no window  
  return "/api/trpc";
};

export const getSocketUrl = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    
    // Local development
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.")) {
       return `http://${hostname}:3001`;
    }

    // Production: Usar el proxy de Vercel para evitar problemas de CORS en móviles
    return "";
  }
  
  return "";
};
