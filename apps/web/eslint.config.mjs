// Lint apps/web: Next + TS, ranh giới import một chiều (frontend-structure §3), cấm chuỗi cứng (i18n §1).
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import boundaries from 'eslint-plugin-boundaries';
import i18next from 'eslint-plugin-i18next';

export default [
  ...nextVitals,
  ...nextTs,
  { ignores: ['.next/**', '.next-http/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**'] },
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
            // features/a không import features/b/components/* — qua index.ts, hoặc thẳng tới module LÁ công khai của b (api / *-store /
            // types / ui-commands: query key, store UI, type, lệnh Trợ lý) để không kéo cả Screen của b vào đồ thị (TIP-001b — gỡ vòng
            // phụ thuộc thật, tách chunk). Component của module khác chỉ nạp ĐỘNG (`import()` qua shared/dynamic/lazy-drawers — DC-446).
            {
              group: ['@/features/*/*', '!@/features/*/api', '!@/features/*/*-store', '!@/features/*/types', '!@/features/*/ui-commands', '**/features/*/components/*'],
              message: 'Import module khác qua @/features/<module> (index.ts) hoặc @/features/<module>/{api,*-store,types,ui-commands}',
            },
          ],
        },
      ],
    },
  },
  {
    // Định dạng số / ngày / tiền qua fmt.* (packages/shared/src/fmt, useFmt) theo locale + timezone workspace (i18n §4, TIP-001b §3.3);
    // breakpoint qua token `mq` / `responsive.*`, không viết media query tay (frontend-structure §11, TIP-001b §3.2).
    // `Intl.Segmenter` (tách ký tự, không định dạng) không bị chặn.
    files: ['src/features/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        2,
        { selector: "CallExpression[callee.property.name=/^toLocale(String|DateString|TimeString)$/]", message: 'Định dạng qua fmt.* (useFmt), không toLocale*String' },
        { selector: "MemberExpression[object.name='Intl'][property.name=/^(NumberFormat|DateTimeFormat|RelativeTimeFormat|PluralRules|ListFormat|DisplayNames)$/]", message: 'Định dạng qua fmt.* (useFmt), không Intl.* trực tiếp' },
        { selector: "TemplateElement[value.raw=/@media/]", message: 'Breakpoint qua token mq.* / responsive.* (antd-style), không viết @media tay' },
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
          callees: { exclude: ['t[a-zA-Z]*', 't[a-zA-Z]*\.rich', 'useTranslations', 'require'] },
          'jsx-attributes': { include: ['title', 'placeholder', 'alt', 'aria-label', 'label'] },
          // ký hiệu trang trí của prototype, không phải chuỗi dịch
          words: { exclude: ['[✓✕▾·→—•]', '[0-9.,:%₫ ]+'] },
        },
      ],
    },
  },
  {
    // ảnh nhỏ cố định của shell (logo 30px, cờ 20×14) — giữ <img> để khớp pixel prototype
    files: ['src/shared/shell/**/*.tsx', 'src/features/auth/components/AuthLayout.tsx'],
    rules: { '@next/next/no-img-element': 0 },
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'e2e/**/*.ts'],
    rules: { 'i18next/no-literal-string': 0 },
  },
];
