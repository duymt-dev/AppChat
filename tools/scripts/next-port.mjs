// node ../../tools/scripts/next-port.mjs dev|start [đối số next…] (TIP-035d, DC-908 d): web nghe `WEB_PORT` — env, rồi dòng `WEB_PORT=`
// trong `.env` ở gốc repo (turbo / pnpm không chuyển biến), không có → 3000 (checkout chính như cũ). Chuyển tín hiệu, trả mã thoát của next.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = join(import.meta.dirname, '..', '..');

export function webPort(env = process.env, envFile = join(ROOT, '.env')) {
  if (env.WEB_PORT) return Number(env.WEB_PORT);
  const line = existsSync(envFile) ? /^WEB_PORT=(\d+)\s*$/m.exec(readFileSync(envFile, 'utf8')) : null;
  return line ? Number(line[1]) : 3000;
}

function main(argv) {
  const [mode, ...rest] = argv;
  if (mode !== 'dev' && mode !== 'start') return console.error('dùng: next-port.mjs dev|start [đối số…]'), Promise.resolve(2);
  const bin = createRequire(join(ROOT, 'apps', 'web', 'package.json')).resolve('next/dist/bin/next');
  const child = spawn(process.execPath, [bin, mode, '-p', String(webPort()), ...rest], { stdio: 'inherit', cwd: join(ROOT, 'apps', 'web') });
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
  return new Promise((ok) => child.on('exit', (code, sig) => ok(code ?? (sig ? 1 : 0))));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(await main(process.argv.slice(2)));
