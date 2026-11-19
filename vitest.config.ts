import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['{src,functions}/**/*.test.{ts,tsx}'],
    exclude: [...configDefaults.exclude, 'src/shared/productionHardening.test.ts'],
  },
});
