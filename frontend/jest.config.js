module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/?(*.)+(test).[tj]s?(x)'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    '<rootDir>/stores/whiteboardStore.ts',
    '<rootDir>/stores/notificationStore.ts',
    '<rootDir>/utils/formatDate.ts',
    '<rootDir>/utils/inviteCode.ts',
    '<rootDir>/utils/sanitize.ts',
    '<rootDir>/components/QuestionCard.tsx',
    '<rootDir>/components/ui/GlassButton.tsx',
    '<rootDir>/components/ui/GlassCard.tsx',
    '<rootDir>/components/ui/GlassInput.tsx',
    '<rootDir>/components/ui/GlassModal.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 35,
      functions: 50,
      lines: 55,
      statements: 55,
    },
  },
};
