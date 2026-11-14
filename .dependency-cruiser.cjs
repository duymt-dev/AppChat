// pnpm depcheck (D59, DC-004): ranh giới import một chiều (Blueprint §1.1, CLAUDE.md §3), không vòng, không import gói chưa khai.
// Gói nội bộ resolve theo tên `@appchat/*` (workspace symlink) → so theo đường dẫn thật `apps/<x>/` / `packages/<x>/`.
const pkg = (names) => `^packages/(${names.join('|')})/`;
const INTERNAL = ['shared', 'actions', 'db', 'ai', 'channels', 'integrations', 'core', 'ui'];
const others = (allowed) => pkg(INTERNAL.filter((p) => !allowed.includes(p)));

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    { name: 'shared-standalone', severity: 'error', comment: 'shared không import gói nội bộ nào',
      from: { path: '^packages/shared/' }, to: { path: others(['shared']) } },
    { name: 'actions-only-shared', severity: 'error', comment: 'actions → chỉ shared',
      from: { path: '^packages/actions/' }, to: { path: others(['actions', 'shared']) } },
    { name: 'db-only-shared', severity: 'error', comment: 'db → chỉ shared',
      from: { path: '^packages/db/' }, to: { path: others(['db', 'shared']) } },
    { name: 'adapters-no-core', severity: 'error', comment: 'ai / channels / integrations → chỉ shared, actions (nhận dependency qua interface)',
      from: { path: '^packages/(ai|channels|integrations)/' }, to: { path: pkg(['db', 'core', 'ui']) } },
    { name: 'adapters-independent', severity: 'error', comment: 'ai, channels, integrations không import lẫn nhau',
      from: { path: '^packages/(ai|channels|integrations)/' }, to: { path: '^packages/(ai|channels|integrations)/', pathNot: '^packages/$1/' } },
    { name: 'core-no-ui-no-apps', severity: 'error', comment: 'core → db, actions, shared, ai, channels, integrations',
      from: { path: '^packages/core/' }, to: { path: '^(packages/ui/|apps/)' } },
    { name: 'backend-apps-no-ui', severity: 'error', comment: 'api / worker không import ui hay app khác',
      from: { path: '^apps/(api|worker)/' }, to: { path: '^(packages/ui/|apps/(web|widget)/)' } },
    { name: 'backend-apps-isolated', severity: 'error', comment: 'api và worker không import lẫn nhau',
      from: { path: '^apps/(api|worker)/' }, to: { path: '^apps/(api|worker)/', pathNot: '^apps/$1/' } },
    { name: 'web-no-backend', severity: 'error', comment: 'web / widget / ui chỉ dùng actions, shared, ui',
      from: { path: '^(apps/(web|widget)|packages/ui)/' }, to: { path: pkg(['db', 'core', 'ai', 'channels', 'integrations']) } },
    { name: 'ui-no-apps', severity: 'error', from: { path: '^packages/ui/' }, to: { path: '^apps/' } },
    { name: 'no-circular', severity: 'error', comment: 'không vòng phụ thuộc',
      from: { path: '^(apps|packages)/', pathNot: '^apps/web/' }, to: { circular: true } },
    // TIP-001b (đóng DV-001, DC-446): apps/web không còn vòng RUNTIME — chặn như mọi gói. Vòng chỉ qua `import type` (MockDb ↔ State của
    // domain mock) bị TypeScript xoá khi biên dịch, không đổi thứ tự nạp module → không tính.
    { name: 'no-circular-web', severity: 'error', comment: 'không vòng phụ thuộc runtime ở apps/web',
      from: { path: '^apps/web/' }, to: { circular: true, viaOnly: { dependencyTypesNot: ['type-only'] } } },
    { name: 'web-no-own-barrel', severity: 'error', comment: 'trong một module, import file trực tiếp — index.ts chỉ cho module khác / app (TIP-001b §1.1)',
      from: { path: '^apps/web/src/features/([^/]+)/' }, to: { path: '^apps/web/src/features/$1/index\\.ts$' } },
    { name: 'no-non-package-json', severity: 'error', comment: 'import gói npm phải khai trong package.json của gói đó',
      from: { path: '^(apps|packages)/' }, to: { dependencyTypes: ['npm-no-pkg', 'npm-unknown'] } },
    { name: 'not-to-unresolvable', severity: 'error', from: { path: '^(apps|packages)/' }, to: { couldNotResolve: true } },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['(^|/)(node_modules|dist|\\.next|\\.next-http|\\.next-mock|\\.turbo|coverage|test-results|playwright-report)/', 'next-env\\.d\\.ts$', '/src/generated/'] },
    tsPreCompilationDeps: true,
    // alias `@/` của apps/web (tsconfig riêng, chỉ khai paths)
    tsConfig: { fileName: 'tsconfig.depcruise.json' },
    combinedDependencies: false,
    preserveSymlinks: false,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'],
      mainFields: ['types', 'module', 'main'],
    },
  },
};
