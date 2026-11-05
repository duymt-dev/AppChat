// Tiến trình worker ROLE=ai thật cho integration (TIP-023b): chạy bản build `dist/main.js` (module production — không Test module, không
// mock registry) với env `.env` máy dev + Redis DB riêng của test (mặc định 15 — không đụng hàng đợi demo). Dừng / chạy lại để kiểm
// chạy tiếp sau khi tiến trình khởi động lại.
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { testDbEnv } from '@appchat/db';

const WORKER = join(import.meta.dirname, '..', '..', '..');
const ROOT = join(WORKER, '..', '..');

const readEnv = (f: string): Record<string, string> =>
  existsSync(f)
    ? Object.fromEntries(
        readFileSync(f, 'utf8')
          .split(/\r?\n/)
          .filter((l) => /^[A-Z_]+=/.test(l))
          .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
      )
    : {};

const base = readEnv(join(ROOT, '.env'));
/** Env của lượt test: Redis DB riêng (hàng đợi BullMQ không prefix — worker demo DB 0 không lấy job của test), model giả. */
export const testEnv: Record<string, string> = {
  ...base,
  // DB nền tảng riêng của test (DC-358).
  ...testDbEnv(base),
  NODE_ENV: 'test',
  LOG_LEVEL: 'warn',
  AI_ENGINE: 'mock',
  MAIL_PROVIDER: 'console',
  MAIL_TRANSPORT: 'fake',
  TAX_LOOKUP_PROVIDER: 'mock',
  REDIS_URL: base.TEST_REDIS_URL ?? (base.REDIS_URL ?? 'redis://127.0.0.1:6379/0').replace(/\/\d+$/, '') + '/15',
};

export interface AiProcess {
  stop(): Promise<void>;
  /** Dòng log (stderr / stdout) — chẩn đoán khi test đỏ, không in bí mật (LOG_LEVEL warn). */
  logs: string[];
}

/** Chạy `node dist/main.js` ROLE=ai; chờ dòng "worker started" (≤ 60 giây). */
export async function startAiProcess(): Promise<AiProcess> {
  if (!existsSync(join(WORKER, 'dist', 'main.js'))) throw new Error('Chưa build worker: pnpm --filter @appchat/worker build');
  const logs: string[] = [];
  const p: ChildProcess = spawn(process.execPath, ['dist/main.js'], { cwd: WORKER, env: { ...process.env, ...testEnv, ROLE: 'ai', LOG_LEVEL: 'info' }, stdio: ['ignore', 'pipe', 'pipe'] });
  const started = new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`worker ai không lên sau 60 giây:\n${logs.slice(-20).join('\n')}`)), 60_000);
    const on = (b: Buffer) => {
      for (const l of b.toString().split(/\r?\n/).filter(Boolean)) {
        logs.push(l.slice(0, 500));
        if (l.includes('worker started')) {
          clearTimeout(t);
          resolve();
        }
      }
    };
    p.stdout!.on('data', on);
    p.stderr!.on('data', on);
    p.once('exit', (code) => reject(new Error(`worker ai thoát ${code}:\n${logs.slice(-20).join('\n')}`)));
  });
  await started;
  return {
    logs,
    stop: () =>
      new Promise<void>((resolve) => {
        if (p.exitCode !== null) return resolve();
        p.once('exit', () => resolve());
        p.kill();
      }),
  };
}

export const until = async (fn: () => Promise<boolean>, ms = 30_000): Promise<boolean> => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
};
