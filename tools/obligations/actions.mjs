// Action trong packages/actions ↔ @ActionHandler trong core (có preview?) ↔ risk. Ra actions.json.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const rel = (f) => path.relative(ROOT, f).replaceAll('\\', '/');

const defs = [];
for (const f of walk(path.join(ROOT, 'packages/actions/src')).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))) {
  const s = fs.readFileSync(f, 'utf8');
  const blocks = s.split('defineAction(').slice(1);
  for (const b of blocks) {
    const id = (b.match(/id:\s*'([^']+)'/) ?? [])[1];
    if (!id) continue;
    const risk = (b.match(/risk:\s*'([^']+)'/) ?? [])[1];
    const line = s.slice(0, s.indexOf(`id: '${id}'`)).split('\n').length;
    defs.push({ id, risk, module: (b.match(/module:\s*'([^']+)'/) ?? [])[1], file: `${rel(f)}:${line}` });
  }
}

// Handler: lớp có @ActionHandler('x'); preview = lớp đó có method preview( trước @ActionHandler kế tiếp.
const handlers = new Map();
for (const f of walk(path.join(ROOT, 'packages/core/src')).filter((f) => f.endsWith('.ts'))) {
  const s = fs.readFileSync(f, 'utf8');
  const parts = s.split(/(?=@ActionHandler\(')/);
  for (const p of parts) {
    const id = (p.match(/^@ActionHandler\('([^']+)'\)/) ?? [])[1];
    if (!id) continue;
    const line = s.slice(0, s.indexOf(p)).split('\n').length;
    handlers.set(id, { file: `${rel(f)}:${line}`, preview: /\n\s+(async\s+)?preview\(/.test(p) });
  }
}
const out = defs.map((d) => ({ ...d, handler: handlers.get(d.id)?.file ?? null, preview: handlers.get(d.id)?.preview ?? false }));
fs.writeFileSync(path.join(ROOT, 'tools/obligations/actions.json'), JSON.stringify(out, null, 1));
const w = out.filter((a) => a.risk !== 'read');
console.log('actions', out.length, 'handlers', handlers.size, 'no-handler', out.filter((a) => !a.handler).length, 'write', w.length, 'write-with-handler-no-preview', w.filter((a) => a.handler && !a.preview).length);
console.log('NO HANDLER:', out.filter((a) => !a.handler).map((a) => a.id).join(' '));
