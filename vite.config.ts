import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { colyseus } from 'colyseus/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Runs the Colyseus server inside Vite's dev server (same origin, HMR
    // for room code). `vite build` also emits dist/server/server.mjs, which
    // serves dist/client in production (serveClient).
    colyseus({
      serverEntry: './server/src/app.config.ts',
      serveClient: true,
    }),
  ],
  resolve: {
    // @colyseus/react is linked from a local checkout (file: dependency);
    // dedupe keeps a single copy of react + the colyseus runtime in the
    // bundle, or hooks and schema instanceof checks would break.
    dedupe: ['react', 'react-dom', '@colyseus/sdk', '@colyseus/schema'],
  },
  environments: {
    colyseus: {
      // the generated server entry uses top-level await; the default
      // (browser-ish) build target rejects it
      build: { target: 'esnext' },
    },
  },
})
