// Đối chiếu đường dẫn FE gọi (transport.get / post / blob / api.get…) với route API thật (NestJS). Ra JSON để dựng COVERAGE.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === 'node_modules' ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]));
const norm = (p) => p.replace(/\?.*$/, '').replace(/\$\{[^}]+\}/g, ':p').replace(/:[A-Za-z_]+/g, ':p').replace(/\/+$/, '');

const api = new Map();
for (const f of walk(path.join(ROOT, 'apps/api/src')).filter((f) => f.endsWith('.ts'))) {
  const s = fs.readFileSync(f, 'utf8');
  const ctrl = (s.match(/@Controller\((?:'([^']*)')?\)/) ?? [])[1] ?? '';
  for (const m of s.matchAll(/@(Get|Post|Put|Patch|Delete)\((?:'([^']*)')?\)/g)) {
    const p = norm(['', ctrl, m[2] ?? ''].join('/').replace(/\/+/g, '/'));
    api.set(`${m[1].toUpperCase()} ${p}`, path.relative(ROOT, f).replaceAll('\\', '/'));
  }
}

const fe = new Map();
for (const f of walk(path.join(ROOT, 'apps/web/src')).filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.|\/mock\//.test(f.replaceAll('\\', '/')))) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/\.(get|post|blob)(?:<[^()]*?>)?\(\s*[`'"](\/[^`'"]*)[`'"]/g)) {
    const method = m[1] === 'post' ? 'POST' : 'GET';
    const key = `${method} ${norm(m[2])}`;
    if (!fe.has(key)) fe.set(key, path.relative(ROOT, f).replaceAll('\\', '/'));
  }
}
const apiKeys = [...api.keys()];
const matches = (k) => api.has(k) || apiKeys.some((a) => a.replace(/:p/g, '') === k.replace(/:p/g, ''));
const missing = [...fe].filter(([k]) => !matches(k)).map(([route, file]) => ({ route, file }));
fs.writeFileSync(path.join(ROOT, 'tools/obligations/routes.json'), JSON.stringify({ api: Object.fromEntries(api), fe: Object.fromEntries(fe), missing }, null, 1));
console.log('api', api.size, 'fe', fe.size, 'fe-not-in-api', missing.length);
for (const m of missing) console.log(m.route.padEnd(52), m.file);
