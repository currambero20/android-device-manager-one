import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/appRouter";

export const trpc = createTRPCReact<AppRouter>();



export const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    // Si estamos en un entorno de navegador
    const hostname = window.location.hostname;
    
    // Si es local, usamos el puerto 3001 del backend
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.")) {
       return `http://${hostname}:3001/api/trpc`;
    }

    // En producción (Vercel), primero intentamos usar el propio dominio (Vercel Serverless)
    // Esto asegura que la navegación inicial sea rápida y no dependa de Render
    return "/api/trpc";
  }

  // Fallback para SSR o entornos sin window
  return process.env.VITE_API_URL || "/api/trpc";
};
