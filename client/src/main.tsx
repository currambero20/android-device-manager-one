import { getBaseUrl, trpc } from "./lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";


const queryClient = new QueryClient();

// ✅ Usar lógica unificada de getBaseUrl
const API_URL = getBaseUrl();

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: API_URL,
      transformer: superjson,
      fetch(input, init) {
        const url = typeof input === 'string' ? input : input.url;
        console.log("📡 [Request]", url);
        
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
          mode: "cors",
        }).then(async (res) => {
          console.log("📬 [Response] Status:", res.status, res.statusText);
          if (!res.ok) {
            const text = await res.text();
            console.error("❌ [Response Error]", text);
          }
          return res;
        }).catch((err) => {
          console.error("❌ [Fetch Error]", err.message, err.cause);
          throw err;
        });
      },
    }),
  ],
});

console.log("🚀 [Application Start] Environment:", import.meta.env.MODE);

console.log("🔗 [API Configuration] Target URL:", API_URL);

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("❌ Fatal Error: Could not find root element!");
} else {
  try {
console.log("🎬 [Mounting] Starting React application...");
      
      if (!window.location.hostname) {
        throw new Error("No se pudo obtener la información del host");
      }
      
      const root = createRoot(rootElement);
      root.render(
       <trpc.Provider client={trpcClient} queryClient={queryClient}>
         <QueryClientProvider client={queryClient}>
           <App />
         </QueryClientProvider>
       </trpc.Provider>
     );
     console.log("✅ React mounted successfully");
  } catch (error) {
     console.error("❌ React Mounting Failed:", error);
     rootElement.innerHTML = `
       <div style="height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;background:#0a0a0a;color:#fff;text-align:center;padding:20px;">
         <h1 style="color:#ff4d4d;margin-bottom:10px;">Error de Inicialización</h1>
         <p style="color:#aaa;max-width:500px;">El sistema no pudo arrancar correctamente. Esto puede deberse a un fallo en la conexión con la API o un error crítico de JavaScript.</p>
         <pre style="background:#1a1a1a;padding:15px;border-radius:8px;font-size:12px;color:#ff6b6b;margin-top:20px;text-align:left;max-width:90%;">
Original Error: ${String(error)}
URL: ${window.location.href}
API: ${API_URL}
         </pre>
         <button onclick="window.location.reload()" style="margin-top:30px;padding:10px 20px;background:#3b82f6;border:none;border-radius:5px;color:white;cursor:pointer;font-weight:bold;">Reintentar Conexión</button>
       </div>
     `;
  }
}


