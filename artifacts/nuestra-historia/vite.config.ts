import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : undefined;
const basePath = process.env.BASE_PATH ?? '/';

const replitPlugins = [];

if (process.env.NODE_ENV !== 'production' && process.env.REPL_ID !== undefined) {
  try {
    const runtimeErrorOverlay = await import('@replit/vite-plugin-runtime-error-modal').then((m) => m.default);
    replitPlugins.push(runtimeErrorOverlay());
  } catch {}

  try {
    const cartographer = await import('@replit/vite-plugin-cartographer').then((m) => m.cartographer);
    replitPlugins.push(cartographer({ root: path.resolve(import.meta.dirname, '..') }));
  } catch {}

  try {
    const devBanner = await import('@replit/vite-plugin-dev-banner').then((m) => m.devBanner);
    replitPlugins.push(devBanner());
  } catch {}
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    ...replitPlugins,
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: port
    ? { port, strictPort: true, host: '0.0.0.0', allowedHosts: true, fs: { strict: true } }
    : undefined,
  preview: port
    ? { port, host: '0.0.0.0', allowedHosts: true }
    : undefined,
});
