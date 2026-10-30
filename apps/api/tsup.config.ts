// Bundle ESM cho Node 24; gói @appchat/* (nguồn TS) được gộp vào, phụ thuộc npm để ngoài. Decorator metadata qua @swc/core.
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node24',
  sourcemap: true,
  clean: true,
  noExternal: [/^@appchat\//],
});
