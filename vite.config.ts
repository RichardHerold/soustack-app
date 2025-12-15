import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  ssr: {
    noExternal: ['soustack'] // Ensure soustack is bundled for SSR
  },
  optimizeDeps: {
    exclude: ['soustack'] // Don't pre-bundle soustack (it uses Node.js modules)
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts}']
  }
});
