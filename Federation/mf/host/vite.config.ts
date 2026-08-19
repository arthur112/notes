import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { federation } from '@module-federation/vite'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'host',
      remotes: {
        invoices: {
          type: 'module',
          entry: 'http://localhost:5001/remoteEntry.js',
        },
        reports: {
          type: 'module',
          entry: 'http://localhost:5002/remoteEntry.js',
        },
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
      },
      // Types are hand-maintained in src/remotes.d.ts — no need for the
      // DTS plugin to download @mf-types.zip archives from the remotes.
      dts: false,
    }),
  ],
  server: { port: 5000 },
  preview: { port: 5000 },
  build: { target: 'esnext' },
})
