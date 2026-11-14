// pnpm e2e:http [spec…] — E2E trên backend thật (D57 / D59 "E2E luồng TIP ở http"): build api + worker, chạy bản build
// (api cổng 4117 + /widget.js, worker ROLE=jobs + ROLE=channels với Zalo giả) với env `.env` máy dev + MAIL_CONSOLE_DIR (đọc OTP / link), rồi Playwright với
// apps/web/playwright.http.config.ts (web `next build` NEXT_PUBLIC_API_MODE=http, rewrite /api → API). Dọn tiến trình khi xong.
// Worktree (TIP-035d, DC-908 e): giữ một slot Postgres suốt lượt; cổng API / web E2E phải trống trước khi bật (in PID giữ cổng); health phải
// trả đúng `instance` (WORKTREE_ID | main) — không bao giờ chạy test vào backend của worktree khác. Cổng lấy từ env / `.env` của worktree.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { testDbEnv } from '../../packages/db/src/test-env.ts';
import { withSlot } from './pg-slot.mjs';
import { assertPortsFree, expectedInstance } from './worktree-env.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
const envFile = join(ROOT, '.env');
const base = existsSync(envFile)
  ? Object.fromEntries(
      readFileSync(envFile, 'utf8')
        .split(/\r?\n/)
        .filter((l) => /^[A-Z_][A-Z0-9_]*=/.test(l))
        .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
    )
  : {};
const API_PORT = process.env.E2E_API_PORT ?? base.E2E_API_PORT ?? '4117';
const WEB_PORT = process.env.E2E_HTTP_PORT ?? base.E2E_HTTP_PORT ?? '3418';
const INSTANCE = expectedInstance({ ...base, ...process.env });
await withSlot(() => main(), { wait: 1800, label: 'e2e:http' }).then((code) => process.exit(code));

async function main() {
const busy = await assertPortsFree([API_PORT, WEB_PORT]);
if (busy) {
  console.error(`e2e:http — ${busy}`);
  return 1;
}
const mailDir = mkdtempSync(join(tmpdir(), 'appchat-mail-'));
// Tệp tải lên (TIP-020) của lượt E2E — xoá khi xong.
const filesDir = mkdtempSync(join(tmpdir(), 'appchat-files-'));
const env = {
  ...process.env,
  ...base,
  // DB nền tảng riêng của test (DC-358) — demo không thấy workspace của lượt chạy.
  ...testDbEnv(base),
  NODE_ENV: 'test',
  LOG_LEVEL: 'warn',
  API_PORT,
  MAIL_PROVIDER: 'console',
  MAIL_CONSOLE_DIR: mailDir,
  TAX_LOOKUP_PROVIDER: 'mock',
  COOKIE_SECURE: 'false',
  // Mã nhúng widget (TIP-017) trỏ về API của lượt E2E; API phục vụ /widget.js từ apps/widget/dist.
  WIDGET_API_URL: `http://localhost:${API_PORT}`,
  // Origin web của lượt E2E (socket realtime nối thẳng API — CORS / kiểm Origin của TIP-045b).
  CORS_ORIGINS: [base.CORS_ORIGINS, `http://localhost:${WEB_PORT}`].filter(Boolean).join(','),
  // Hộp thư kênh Email giả (TIP-018): API kiểm tra / kết nối, worker poll + gửi — không đăng nhập IMAP / SMTP thật.
  MAIL_TRANSPORT: 'fake',
  // Mail của DN (TIP-012c): Brevo giả trong bộ nhớ — không mạng / không thư thật.
  TENANT_MAIL_TRANSPORT: 'fake',
  // Model giả (TIP-019, Q-001 chưa có key 9router): engine AI SDK thật, câu trả lời theo kịch bản.
  AI_ENGINE: 'mock',
  // Không seed provider embed thật (TIP-020e) — E2E chạy embedding giả.
  EMBED_SEED_PROVIDER_KEY: '',
  FILES_DIR: filesDir,
  // Mỗi spec onboarding một workspace mới (DB tenant riêng) trên 4 tiến trình: pool tenant nhỏ + đóng client rảnh sau 20 giây để
  // Postgres dev (max_connections 100) không cạn slot khi chạy toàn bộ song song.
  TENANT_POOL_MAX: '2',
  TENANT_CLIENT_IDLE_MS: '20000',
  // Redis DB riêng của test (DC-310, mặc định 15): worker của lượt E2E không lấy job BullMQ / khoá rate-limit của tiến trình demo DB 0.
  REDIS_URL: process.env.E2E_REDIS_URL ?? base.TEST_REDIS_URL ?? (base.REDIS_URL ?? 'redis://127.0.0.1:6379/0').replace(/\/\d+$/, '') + '/15',
};

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { stdio: 'inherit', shell: true, cwd: ROOT, ...opts });
if (!process.argv.includes('--no-build')) {
  const b = run('pnpm', ['turbo', 'run', 'build', '--filter=@appchat/api', '--filter=@appchat/worker', '--filter=@appchat/widget']);
  if (b.status !== 0) return b.status ?? 1;
}

// Worker theo vai trò (mặc định đủ jobs, ai, channels). `E2E_WORKERS=jobs,ai` bỏ worker kênh khi spec không cần — Redis DB test không chung
// lease với tiến trình demo, nên worker Zalo giả không được nhận phiên tài khoản kênh thật của demo trên cùng Postgres.
const ROLES = new Set((process.env.E2E_WORKERS ?? 'jobs,ai,channels').split(',').map((r) => r.trim()));
const worker = (role, extra = {}) => (ROLES.has(role) ? [spawn('node', ['dist/main.js'], { cwd: join(ROOT, 'apps/worker'), env: { ...env, ROLE: role, ...extra }, stdio: 'inherit' })] : []);
const procs = [
  spawn('node', ['dist/main.js'], { cwd: join(ROOT, 'apps/api'), env, stdio: 'inherit' }),
  ...worker('jobs'),
  // TIP-020: worker AI — nạp tài liệu kho tri thức (`kb-ingest`, embedding giả).
  ...worker('ai'),
  // TIP-014: worker kênh với Zalo giả (Q-003 — chưa có tài khoản Zalo phụ): QR tự "quét" sau 1,5 giây, gửi không trễ.
  ...worker('channels', { ZALO_TRANSPORT: 'fake', CHANNEL_SEND_JITTER: '0', ZALO_FAKE_GREETING: 'Chào shop, cho mình hỏi lịch hẹn', MAIL_FAKE_GREETING: 'Spa còn lịch chiều nay không ạ?' }),
];
const stop = () => {
  for (const p of procs) p.kill();
  rmSync(mailDir, { recursive: true, force: true });
  rmSync(filesDir, { recursive: true, force: true });
};
process.on('SIGINT', () => {
  stop();
  process.exit(130);
});

// Chờ API sẵn sàng (`E2E_BOOT_MS` nới khi máy dev bận — mặc định 60 giây).
const BOOT_MS = Number(process.env.E2E_BOOT_MS ?? 60_000);
const deadline = Date.now() + BOOT_MS;
for (;;) {
  let instance = null;
  try {
    const h = await fetch(`http://localhost:${API_PORT}/v1/health`);
    instance = h.ok ? ((await h.json())?.data?.instance ?? 'main') : null;
  } catch {
    /* chưa lên */
  }
  if (instance && instance !== INSTANCE) {
    console.error(`e2e:http — cổng ${API_PORT} trả instance "${instance}", cần "${INSTANCE}" — dừng (không chạy test vào backend lạ)`);
    stop();
    return 1;
  }
  if (instance) break;
  if (Date.now() > deadline) {
    console.error(`e2e:http — API không lên sau ${BOOT_MS / 1000} giây`);
    stop();
    return 1;
  }
  await new Promise((r) => setTimeout(r, 500));
}

// Spec + cờ Playwright (vd. `--workers=2` khi Postgres dev chạm `max_connections`) chuyển thẳng; `--no-build` là cờ của script.
const specs = process.argv.slice(2).filter((a) => a !== '--no-build');
const r = run('pnpm', ['exec', 'playwright', 'test', '--config', 'playwright.http.config.ts', ...specs], {
  cwd: join(ROOT, 'apps/web'),
  // Spec billing giả webhook ngân hàng nền tảng (/hooks/payments/mock) bằng cùng khoá HMAC với API (TIP-010).
  env: { ...process.env, E2E_HTTP_PORT: WEB_PORT, ...(base.WORKTREE_ID ? { WORKTREE_ID: base.WORKTREE_ID } : {}), API_URL: `http://localhost:${API_PORT}`, MAIL_CONSOLE_DIR: mailDir, MOCK_BANK_FEED_KEY: env.MOCK_BANK_FEED_KEY ?? 'mock-bank-feed-dev', PLATFORM_BANK_ACCOUNT_NO: env.PLATFORM_BANK_ACCOUNT_NO ?? '0071000888999' },
});
stop();
return r.status ?? 1;
}
