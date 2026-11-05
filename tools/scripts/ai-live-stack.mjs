// `node tools/scripts/ai-live-stack.mjs [--no-build] -- <args của pnpm ai:live>` (TIP-023c AC5, Q-046): dựng API + worker (jobs / ai /
// channels Zalo giả) ở cổng RIÊNG (mặc định 4617) với engine model THẬT (env `.env` máy dev — LLM_SEED_*), Redis DB riêng (mặc định 14,
// không tranh job với integration DB 15 / demo), hộp thư console tạm → chạy `pnpm ai:live` trỏ vào stack đó → dừng hết. Không đụng
// cổng / dữ liệu demo. Không in env.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { testDbEnv } from '../../packages/db/src/test-env.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const PORT = process.env.AI_LIVE_PORT ?? '4617';
const DB = process.env.AI_LIVE_REDIS_DB ?? '14';
const envFile = join(ROOT, '.env');
const base = existsSync(envFile)
  ? Object.fromEntries(
      readFileSync(envFile, 'utf8')
        .split(/\r?\n/)
        .filter((l) => /^[A-Z_]+=/.test(l))
        .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
    )
  : {};
const mailDir = mkdtempSync(join(tmpdir(), 'appchat-ailive-mail-'));
const filesDir = mkdtempSync(join(tmpdir(), 'appchat-ailive-files-'));
const env = {
  ...process.env,
  ...base,
  // DB nền tảng riêng của test (DC-358) — demo không thấy workspace của lượt chạy.
  ...testDbEnv(base),
  NODE_ENV: 'test',
  LOG_LEVEL: 'warn',
  API_PORT: PORT,
  MAIL_PROVIDER: 'console',
  MAIL_CONSOLE_DIR: mailDir,
  TAX_LOOKUP_PROVIDER: 'mock',
  COOKIE_SECURE: 'false',
  WIDGET_API_URL: `http://localhost:${PORT}`,
  MAIL_TRANSPORT: 'fake',
  FILES_DIR: filesDir,
  TENANT_POOL_MAX: '2',
  TENANT_CLIENT_IDLE_MS: '20000',
  REDIS_URL: (base.REDIS_URL ?? 'redis://127.0.0.1:6379/0').replace(/\/\d+$/, '') + `/${DB}`,
};
delete env.AI_ENGINE;

const argv = process.argv.slice(2);
const sep = argv.indexOf('--');
const liveArgs = sep >= 0 ? argv.slice(sep + 1) : [];
if (!argv.includes('--no-build')) {
  const b = spawnSync('pnpm', ['turbo', 'run', 'build', '--filter=@appchat/api', '--filter=@appchat/worker'], { stdio: 'inherit', shell: true, cwd: ROOT });
  if (b.status !== 0) process.exit(b.status ?? 1);
}
const CHANNEL_VERTICAL = { ZALO_FAKE_GREETING: 'Chào shop, mình muốn đặt lịch gội đầu dưỡng sinh chiều thứ bảy này', ZALO_FAKE_UNKNOWN_TEXT: 'Dạ shop gửi chị bảng giá gội đầu dưỡng sinh ạ', ZALO_FAKE_KICK_TEXT: 'ai-live: đá phiên tài khoản này' };
const worker = (role, extra = {}) => spawn('node', ['dist/main.js'], { cwd: join(ROOT, 'apps/worker'), env: { ...env, ROLE: role, ...extra }, stdio: 'inherit' });
const procs = [
  spawn('node', ['dist/main.js'], { cwd: join(ROOT, 'apps/api'), env, stdio: 'inherit' }),
  worker('jobs'),
  worker('ai'),
  // Suite channel-vertical (TIP-014b AC9): khách Zalo giả nhắn khi phiên bắt đầu + một chữ tin cố định cho kết quả gửi `unknown`.
  worker('channels', { ZALO_TRANSPORT: 'fake', CHANNEL_SEND_JITTER: '0', ...(liveArgs.some((a) => a.includes('channel-vertical')) ? CHANNEL_VERTICAL : {}) }),
];
const stop = () => {
  for (const p of procs) p.kill();
  rmSync(mailDir, { recursive: true, force: true });
  rmSync(filesDir, { recursive: true, force: true });
};
process.on('SIGINT', () => (stop(), process.exit(130)));

// Máy dev bận (nhiều stack / test song song) khởi động chậm hơn — `AI_LIVE_BOOT_MS` nới thời gian chờ API (mặc định 60 giây).
const BOOT_MS = Number(process.env.AI_LIVE_BOOT_MS ?? 60_000);
const deadline = Date.now() + BOOT_MS;
for (;;) {
  try {
    if ((await fetch(`http://localhost:${PORT}/v1/health`)).ok) break;
  } catch {}
  if (Date.now() > deadline) {
    stop();
    console.error(`API không lên trong ${BOOT_MS / 1000} giây`);
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 500));
}
const r = spawnSync('pnpm', ['ai:live', ...liveArgs], {
  stdio: 'inherit',
  shell: true,
  cwd: ROOT,
  env: { ...process.env, AI_LIVE_API: `http://localhost:${PORT}/v1`, AI_LIVE_MAIL_DIR: mailDir, AI_LIVE_EMAIL: process.env.AI_LIVE_EMAIL ?? base.AI_LIVE_EMAIL ?? 'genui-screen@ai-live.appchat.test', AI_LIVE_PASSWORD: process.env.AI_LIVE_PASSWORD ?? base.AI_LIVE_PASSWORD ?? 'AiLive@12345' },
});
stop();
process.exit(r.status ?? 1);
