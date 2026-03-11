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
        'process.env.OPENROUTER_API_KEY': JSON.stringify(env.OPENROUTER_API_KEY?.trim()),
        'process.env.QUIZ_GEN_CHAT': JSON.stringify(env.QUIZ_GEN_CHAT?.trim()),
        'process.env.QUIZ_GEN_IMAGES': JSON.stringify(env.QUIZ_GEN_IMAGES?.trim())
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});