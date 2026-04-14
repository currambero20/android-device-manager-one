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
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
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
  // Low-level visual feedback for slow mounting
  rootElement.innerHTML = '<div style="height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;color:#666;">Iniciando sistema MDM Platinum...</div>';
  
  const root = createRoot(rootElement);
  root.render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  );
  
  console.log("✅ React mounted successfully");
}

