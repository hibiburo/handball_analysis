import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        include: ['src/domain/**/*.ts', 'src/lib/**/*.ts', 'src/db/**/*.ts'],
        exclude: ['**/*.test.ts'],
        thresholds: {
          'src/domain/**/*.ts': { statements: 90, branches: 90, functions: 90, lines: 90 },
        },
      },
    },
  }),
);
