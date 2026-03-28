import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['node_modules', 'e2e'], // 排除 e2e 测试
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/utils/**/*.ts', 'src/stores/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.ts'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
