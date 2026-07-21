import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// Multi-page build: index.html is the React dashboard app, everything
// else is static marketing/legal HTML. Without this, `vite build` only
// emits index.html and the marketing site never makes it into dist/ -
// see vercel.json for the rewrite that puts home.html at the root domain
// instead of the dashboard app.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'index.html'),
        demo: resolve(__dirname, 'demo.html'),
        home: resolve(__dirname, 'home.html'),
        about: resolve(__dirname, 'about.html'),
        pricing: resolve(__dirname, 'pricing.html'),
        terms: resolve(__dirname, 'terms.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        sableTerms: resolve(__dirname, 'sable-terms.html'),
        sablePrivacy: resolve(__dirname, 'sable-privacy.html'),
        dataRequest: resolve(__dirname, 'data-request.html'),
      },
    },
  },
})
