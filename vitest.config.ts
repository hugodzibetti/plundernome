import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/domain/__tests__/**/*.test.ts', 'src/services/__tests__/**/*.test.ts', 'src/ui/__tests__/**/*.test.ts', 'tests/integration/**/*.test.ts', 'tests/smoke.test.ts'],
    setupFiles: ['src/ui/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        branches: 85,
        functions: 90,
        lines: 90,
        statements: 90,
      },
      include: ['src/domain/**/*.ts'],
      exclude: ['**/__tests__/**', '**/*.d.ts', '**/index.ts', '**/types*.ts', '**/steam-import.ts', '**/parser.ts', '**/catalog/types.ts'],
    },
  },
})
