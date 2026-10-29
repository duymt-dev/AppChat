// Lint apps/web: Next + TS, ranh giới import một chiều (frontend-structure §3), cấm chuỗi cứng (i18n §1).
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import boundaries from 'eslint-plugin-boundaries';
import i18next from 'eslint-plugin-i18next';

export default [
  ...nextVitals,
  ...nextTs,
  { ignores: ['.next/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.json' } },
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app/**' },
        { type: 'feature', pattern: 'src/features/*', capture: ['feature'] },
        { type: 'shared', pattern: 'src/shared/**' },
        { type: 'i18n', pattern: 'src/i18n/**' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        2,
        {
          default: 'allow',
          policies: [
            // shared không được import features / app
            {
              from: { element: { types: { anyOf: ['shared', 'i18n'] } } },
              disallow: { to: { element: { types: { anyOf: ['feature', 'app'] } } } },
            },
            // features không import app
            { from: { element: { type: 'feature' } }, disallow: { to: { element: { type: 'app' } } } },
          ],
        },
      ],
      // web không bao giờ import core / db (Blueprint §1.1)
      'no-restricted-imports': [
        2,
        {
          patterns: [
            { group: ['@appchat/core', '@appchat/core/*', '@appchat/db', '@appchat/db/*'], message: 'web chỉ dùng actions / shared / ui' },
            { group: ['axios'], message: 'Ghi qua useAction; đọc qua shared/api/transport' },
            // features/a không import features/b/components/* — chỉ qua index.ts
            { group: ['@/features/*/*', '**/features/*/components/*'], message: 'Import module khác qua @/features/<module> (index.ts)' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.tsx'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        2,
        {
          mode: 'jsx-only',
          callees: { exclude: ['t[a-zA-Z]*', 'useTranslations', 'require'] },
          'jsx-attributes': { include: ['title', 'placeholder', 'alt', 'aria-label', 'label'] },
          // ký hiệu trang trí của prototype, không phải chuỗi dịch
          words: { exclude: ['[✓✕▾·→—•]', '[0-9.,:%₫ ]+'] },
        },
      ],
    },
  },
  {
    // ảnh nhỏ cố định của shell (logo 30px, cờ 20×14) — giữ <img> để khớp pixel prototype
    files: ['src/shared/shell/**/*.tsx'],
    rules: { '@next/next/no-img-element': 0 },
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'e2e/**/*.ts'],
    rules: { 'i18next/no-literal-string': 0 },
  },
];
