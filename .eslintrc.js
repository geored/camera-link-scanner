module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script'
    },
    globals: {
        'Tesseract': 'readonly',
        'linkManager': 'writable',
        'scanner': 'writable'
    },
    rules: {
        'no-unused-vars': 'warn',
        'no-console': 'off',
        'prefer-const': 'warn',
        'no-var': 'error',
        'no-undef': 'error',
        'semi': ['error', 'always'],
        'quotes': ['warn', 'single', { 'allowTemplateLiterals': true }],
        'indent': ['warn', 4],
        'no-trailing-spaces': 'warn',
        'eol-last': 'warn',
        'no-multiple-empty-lines': ['warn', { 'max': 2 }],
        'brace-style': ['warn', '1tbs'],
        'comma-dangle': ['warn', 'never'],
        'object-curly-spacing': ['warn', 'always'],
        'array-bracket-spacing': ['warn', 'never'],
        'key-spacing': ['warn', { 'beforeColon': false, 'afterColon': true }],
        'space-before-function-paren': ['warn', 'never'],
        'space-in-parens': ['warn', 'never'],
        'no-multi-spaces': 'warn'
    },
    overrides: [
        {
            files: ['**/*.test.js', '**/tests/**/*.js'],
            env: {
                jest: true
            },
            globals: {
                'expect': 'readonly',
                'test': 'readonly',
                'describe': 'readonly',
                'beforeEach': 'readonly',
                'afterEach': 'readonly',
                'beforeAll': 'readonly',
                'afterAll': 'readonly'
            }
        }
    ]
};