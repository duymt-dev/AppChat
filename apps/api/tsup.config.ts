// Bundle ESM cho Node 24; gói @appchat/* (nguồn TS) được gộp vào, phụ thuộc npm để ngoài. Decorator metadata qua @swc/core.
import { defineConfig } from 'tsup';

export default defineConfig([{
  entry: ['src/main.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node24',
  sourcemap: true,
  clean: true,
  noExternal: [/^@appchat\//],
  // Mọi gói npm (kể cả phụ thuộc bắc cầu của @appchat/*) để ngoài bundle: gói CJS (pg, ioredis…) không chạy được khi gộp vào ESM.
  // Gói nào bundle import tới phải khai ở `dependencies` của app (pnpm strict) — test smoke `node dist/main.js` kiểm.
  external: [/^(?!@appchat\/)(@[^/]+\/)?[^./][^:]*$/],
}, {
  // TIP-032d §2.1: bundle kiểm cấu trúc tệp đính kèm bản ghi (CJS, gộp cả pizzip) — action gắn tệp chạy ở API: tiến trình con
  // `node --permission` chỉ đọc thư mục dist. Không AI parser / KB ingest.
  entry: { 'attachment-validator': 'src/attachment-validator-main.ts' },
  format: ['cjs'],
  platform: 'node',
  target: 'node24',
  outExtension: () => ({ js: '.cjs' }),
  sourcemap: false,
  clean: false,
  noExternal: [/.*/],
}]);
