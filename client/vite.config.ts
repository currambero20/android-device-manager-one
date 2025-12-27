import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

export default defineConfig({
  plugins: [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()],
  base: '/',
  resolve: {
    alias: {
      // Apunta a la carpeta src que está en el mismo nivel que este archivo
      '@': path.resolve(__dirname, './src'),
      // Sale de la carpeta client para buscar la carpeta shared en la raíz
      '@shared': path.resolve(__dirname, '../shared'),
      // Sale de la carpeta client para buscar los assets en la raíz
      "@assets": path.resolve(__dirname, "../attached_assets"),
    },
  },
  // El directorio de entorno es donde está este archivo
  envDir: path.resolve(__dirname),
  // El root es la carpeta actual (client)
  root: path.resolve(__dirname),
  // La carpeta public está dentro de la carpeta actual
  publicDir: path.resolve(__dirname, "public"),
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      // IMPORTANTE: Permite a Vite acceder a la carpeta /shared que está afuera
      allow: ['..'],
      deny: ["**/.*"],
    },
  },
});
