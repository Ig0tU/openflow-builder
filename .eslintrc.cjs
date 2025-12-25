module.exports = {
    root: true,
    env: {
        browser: true,
        node: true,
        es2022: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
        },
    },
    plugins: ['@typescript-eslint', 'react', 'react-hooks'],
    rules: {
        // React 19 doesn't need React in scope
        'react/react-in-jsx-scope': 'off',

        // TypeScript rules
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-non-null-assertion': 'off',

        // General rules
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'prefer-const': 'warn',
        'no-duplicate-imports': 'error',

        // React rules
        'react/prop-types': 'off', // Using TypeScript
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
    },
    settings: {
        react: {
            version: 'detect',
        },
    },
    ignorePatterns: [
        'dist/',
        'node_modules/',
        '*.config.ts',
        '*.config.js',
        'drizzle/',
        'patches/',
    ],
};
