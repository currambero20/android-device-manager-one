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
    
    // [PRO-REFAC] Usar ruta relativa para que el Proxy de Vite haga el túnel de red
    // Esto resuelve 'Failed to fetch' al unificar el tráfico en un solo dominio
    return "/api/trpc";
  }

  // Fallback para SSR
  return import.meta.env.VITE_API_URL || "/api/trpc";
};


