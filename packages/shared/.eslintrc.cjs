module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['dist'],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
    ],
    'no-unused-vars': 'off',
  },
  overrides: [
    {
      files: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],
      globals: {
        expect: 'readonly',
        it: 'readonly',
        describe: 'readonly',
      },
    },
  ],
};
