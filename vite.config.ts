import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Canonical public URL is configured ONCE (VITE_PUBLIC_SITE_URL, falling back to Cloudflare's
 * CF_PAGES_URL for previews). If neither is set, the canonical/OG-url/OG-image tags are removed
 * rather than pointing at an invented domain.
 */
function siteUrlPlugin(): Plugin {
  const raw = process.env.VITE_PUBLIC_SITE_URL || process.env.CF_PAGES_URL || '';
  const siteUrl = raw.replace(/\/+$/, '');
  return {
    name: 'goat-wars-site-url',
    transformIndexHtml(html) {
      if (!siteUrl) return html.replace(/<!--site-url:start-->[\s\S]*?<!--site-url:end-->\s*/g, '');
      return html.replace(/%SITE_URL%/g, siteUrl);
    }
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), siteUrlPlugin()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        admin: path.resolve(__dirname, 'admin/index.html')
      }
    }
  },
  server: {
    port: 3000,
    // `npm run pages:dev` serves /api on :8788; Vite proxies to it during `npm run dev`.
    proxy: { '/api': 'http://127.0.0.1:8788' }
  }
});
