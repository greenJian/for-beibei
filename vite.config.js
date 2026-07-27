import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/for-beibei/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
