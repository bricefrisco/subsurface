import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        panel: 'src/panel/index.html',
      },
    },
  },
  plugins: [
    react(),
    crx({ manifest }),
  ],
})
