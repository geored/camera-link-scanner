module.exports = {
    testEnvironment: 'jsdom',
    testMatch: [
        '**/tests/**/*.test.js',
        '**/src/**/*.test.js'
    ],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/providers/**/*.js', // Exclude external API providers from coverage
        '!src/**/*.test.js'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@components/(.*)$': '<rootDir>/src/components/$1',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@providers/(.*)$': '<rootDir>/src/providers/$1'
    },
    globals: {
        'Tesseract': {
            recognize: jest.fn()
        }
    },
    testTimeout: 10000,
    verbose: true,
    collectCoverage: false, // Set to true when running coverage reports
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        }
    }
};