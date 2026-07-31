import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig({
  // Relative base so Electron can load the built app from the filesystem.
  base: './',
  plugins: [react(), tailwindcss()],
});
