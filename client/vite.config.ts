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
      '@': path.resolve(__dirname, './src'),
      // Esta ruta es correcta: sube un nivel para encontrar shared
      '@shared': path.resolve(__dirname, '../shared'),
      "@assets": path.resolve(__dirname, "../attached_assets"),
    },
  },
  root: path.resolve(__dirname),
  publicDir: path.resolve(__dirname, "public"),
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    fs: {
      // ESTO ES VITAL: Permite a Vite leer archivos fuera de la carpeta client
      allow: ['..']
    }
  }
});
