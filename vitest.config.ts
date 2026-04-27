import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsxInject: "import React from 'react'",
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    coverage: {
      all: false,
      include: [
        'src/services/**/*.{ts,tsx}',
        'src/utils/**/*.{ts,tsx}',
        'src/lib/**/*.{ts,tsx}',
        'src/components/common/Floating*.tsx',
        'src/components/common/FacialInstructionsModal.tsx',
        'src/components/common/ResultModal.tsx',
        'src/components/common/TicketFab.tsx',
        'src/components/common/requiredLabel.tsx',
      ],
      reporter: ['text', 'lcov'],
      thresholds: {
        statements: 85,
        branches: 85,
        functions: 85,
        lines: 85,
      },
    },
  },
});
