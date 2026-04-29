import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: false,
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true
  }
});
