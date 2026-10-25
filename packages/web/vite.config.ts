import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Built into static files that `zcf ui` serves from the CLI package.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': '/src' },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Flat output, so the CLI build can copy the folder as it is.
    assetsDir: '',
    // One small bundle; the server only runs locally.
    modulePreload: false,
    reportCompressedSize: false,
  },
  server: {
    // `pnpm -F @zcf/web dev` talks to a running `zcf ui --port 4318`.
    proxy: { '/api': { target: 'http://127.0.0.1:4318', headers: { host: '127.0.0.1:4318' } } },
  },
})
