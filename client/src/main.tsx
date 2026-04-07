import { getBaseUrl, trpc } from "./lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";
import "sonner/dist/styles.css";

const queryClient = new QueryClient();

// ✅ Usar lógica unificada de getBaseUrl
const API_URL = getBaseUrl();

console.log("🚀 [Application Start] Environment:", import.meta.env.MODE);
console.log("🔗 [API Configuration] Target URL:", API_URL);

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: API_URL,
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

const rootElement = document.getElementById("root");
if (rootElement) {
  // Un pequeño aviso visual de bajo nivel por si React tarda en montar
  rootElement.innerHTML = '<div style="height:100vh;display:flex;align-items:center;justify-center;font-family:sans-serif;color:#666;">Iniciando sistema MDM...</div>';
}

createRoot(rootElement!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
