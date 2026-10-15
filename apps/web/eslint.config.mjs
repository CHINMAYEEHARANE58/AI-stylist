import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = [
  ...compat.config({ extends: ['next/core-web-vitals', 'next/typescript'] }),
  { rules: { 'react/no-unescaped-entities': 'off' } },
  { ignores: ['.next/**', 'next-env.d.ts', 'tsconfig.tsbuildinfo'] },
];

export default eslintConfig;
