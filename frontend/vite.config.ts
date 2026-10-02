import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // MapLibre resolves its WebGL worker relative to the package; prebundling can rewrite it to a missing file.
    exclude: ['maplibre-gl'],
  },
})
