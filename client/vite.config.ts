import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` from root directory
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
  const targetPort = env.PORT || '3001';

  const targetUrl = `http://127.0.0.1:${targetPort}`;

  return {
    plugins: [
      react(), 
      tailwindcss(),
    ].filter(Boolean),
    base: '/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, '../shared'),
      },
    },
    root: path.resolve(__dirname),
    publicDir: path.resolve(__dirname, "public"),
    envDir: path.resolve(__dirname, ".."), 
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    server: {
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: targetUrl,
          changeOrigin: true,
        },
        '/l3mon': {
          target: targetUrl,
          ws: true,
          changeOrigin: true,
        },

      },
      fs: {
        allow: ['..']
      }
    }
  };
});
