import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      '@next/next/no-img-element': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',
    },
  },
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'public/**',
      'out/**',
      '__tests__/**',
      'next.config.*',
      'postcss.config.*',
      'tailwind.config.*',
    ],
  },
];
