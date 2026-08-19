import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { federation } from '@module-federation/vite'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'reports',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/ReportsApp.tsx',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
      },
      dts: false,
    }),
  ],
  server: { port: 5002 },
  preview: { port: 5002 },
  build: { target: 'esnext' },
})
