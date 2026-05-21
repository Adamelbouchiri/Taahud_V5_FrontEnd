import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

export default defineConfig({
  plugins: [
    react(),
    // Compresses images at build time. Source files stay untouched
    // in git; only the production bundle output is reduced. Aggressive
    // PNG settings target the oversized arena assets (~3 MB each).
    ViteImageOptimizer({
      png: { quality: 75, compressionLevel: 9 },
      jpeg: { quality: 80, mozjpeg: true },
      jpg: { quality: 80, mozjpeg: true },
      webp: { quality: 80 },
      svg: {
        multipass: true,
        plugins: [
          {
            name: 'preset-default',
            params: { overrides: { removeViewBox: false } },
          },
        ],
      },
    }),
  ],
  server: { port: 5173 },
});
