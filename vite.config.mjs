import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'frontend-dist',
    emptyOutDir: true,
    assetsDir: 'react-assets',
    rollupOptions: {
      input: {
        page: resolve(__dirname, 'frontend/page.html'),
        catalog: resolve(__dirname, 'frontend/catalog.html')
      }
    }
  }
});
