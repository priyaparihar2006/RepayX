/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    // Read .env from the repository root so the frontend and backend share one file.
    envDir: path.resolve(import.meta.dirname, '..'),
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.tsx'],
      // Tests talk to a fake API at this address (see src/test/fakeApi.ts); no backend is needed.
      env: { VITE_API_BASE_URL: 'http://api.test' },
      include: ['src/**/*.test.{ts,tsx}'],
    },
  };
});
