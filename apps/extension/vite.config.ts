import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig(({ command }) => ({
  plugins: [react(), crx({ manifest })],
  server: {
    port: 5174,
    strictPort: true,
  },
  build: {
    // Keep the unpacked production extension stable while CRXJS development is running.
    outDir: command === 'serve' ? 'dist-dev' : 'dist',
    emptyOutDir: true,
  },
}));
