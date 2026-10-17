import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173 },

  // `npm run smoke` bundles tools/smoke.tsx for node, but the app must still
  // get the *browser* builds of React and TanStack Router — resolved under the
  // node condition, the router short-circuits to its server path and never
  // mounts. Bundling with browser conditions makes the jsdom run behave like a
  // real client.
  ...(mode === 'smoke'
    ? {
        ssr: {
          noExternal: true,
          external: ['jsdom'],
          resolve: {
            conditions: ['browser', 'development', 'module', 'import', 'default'],
            externalConditions: ['browser'],
          },
        },
        build: { minify: false as const },
      }
    : {}),
}))
