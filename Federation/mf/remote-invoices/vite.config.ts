import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { federation } from '@module-federation/vite'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'invoices',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/InvoicesApp.tsx',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
      },
      dts: false,
    }),
  ],
  server: { port: 5001 },
  preview: { port: 5001 },
  build: { target: 'esnext' },
})
