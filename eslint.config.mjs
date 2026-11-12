// Yalnızca hata yakalayan kurallar (biçim kuralı yok): tanımsız değişken ve bileşen
import react from 'eslint-plugin-react';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'functions/node_modules/**', 'test/node_modules/**'] },
  {
    files: ['src/**/*.{js,jsx}', 'functions/*.js', 'scripts/*.{js,cjs}'],
    plugins: { react },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: { 'no-undef': 'error', 'react/jsx-no-undef': 'error', 'react/jsx-uses-vars': 'error', 'no-dupe-keys': 'error' },
  },
];
