import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    // Must match backend_server.py. Default is off 5000 because macOS binds it
    // to the AirPlay Receiver, which answers 403 and breaks the auth proxy.
    const backendPort = process.env.OVERCLOUDED_BACKEND_PORT || '5057';
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: `http://127.0.0.1:${backendPort}`,
            changeOrigin: true,
          },
        },
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
