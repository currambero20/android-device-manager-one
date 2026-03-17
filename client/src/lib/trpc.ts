import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();

// Esto asegura que use la variable correcta para producción o dev
export const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    // Si estamos en producción (Vercel), usamos la URL de Render
    if (window.location.hostname !== "localhost") {
      return import.meta.env.VITE_API_URL || "https://android-device-manager-one-1.onrender.com/api/trpc";
    }
  }
  
  // En local, usamos la variable de entorno o fallback
  return import.meta.env.VITE_API_URL || "http://localhost:3000/api/trpc";
};
