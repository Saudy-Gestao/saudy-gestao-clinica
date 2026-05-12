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
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'src/setupTests.ts',
        'src/main.tsx',
        // UI components — heavy React deps, excluded from coverage requirement
        'src/components/**',
        'src/App.tsx',
        'src/Faturamento/**',
        'src/Financeiro/**',
        // infra files not unit-testable in isolation
        'src/services/patientPortalApi.ts',
        'src/services/api.ts',
        'src/lib/queryClient.ts',
        'src/lib/toast.ts',
        'src/themes/**',
        'src/types/**',
        // streaming / env-dependent files excluded from coverage
        'src/services/aiHelpService.ts',
        'src/services/aiQuestionnaireService.ts',
        'src/services/facialRecognitionService.ts',
        'src/services/getApiBaseUrl.ts',
        'src/services/patientPortalService.ts',
        'src/services/patientPortalAuthService.ts',
        'src/services/publicCheckInSessionService.ts',
        'src/services/teleconsultationLinkService.ts',
        'src/services/publicCheckInService.ts',
        // complex data-transformation hooks excluded from coverage
        'src/hooks/usePatientSummaryQuery.ts',
        'src/hooks/useTeaWeeklyAgendaQuery.ts',
        'src/hooks/useTeaManualGridQuery.ts',
        'src/hooks/useTeaReservationTimelineQuery.ts',
        'src/hooks/useTeaReservationChecklistQuery.ts',
        'src/hooks/useTeaPendingReservationsQuery.ts',
        'src/hooks/usePatientQueueQuery.ts',
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
