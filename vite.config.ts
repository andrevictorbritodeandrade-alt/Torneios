import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify("AIzaSyBipNWMUME_D3PR9KiX4CmQgv1z011BfiA"),
        'process.env.GEMINI_API_KEY': JSON.stringify("AIzaSyBipNWMUME_D3PR9KiX4CmQgv1z011BfiA")
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
