// pnpm e2e:http [spec…] — E2E trên backend thật (D57 / D59 "E2E luồng TIP ở http"): build api + worker, chạy bản build
// (api cổng 4117 + /widget.js, worker ROLE=jobs + ROLE=channels với Zalo giả) với env `.env` máy dev + MAIL_CONSOLE_DIR (đọc OTP / link), rồi Playwright với
// apps/web/playwright.http.config.ts (web `next build` NEXT_PUBLIC_API_MODE=http, rewrite /api → API). Dọn tiến trình khi xong.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const API_PORT = process.env.E2E_API_PORT ?? '4117';
const envFile = join(ROOT, '.env');
const base = existsSync(envFile)
  ? Object.fromEntries(
      readFileSync(envFile, 'utf8')
        .split(/\r?\n/)
        .filter((l) => /^[A-Z_]+=/.test(l))
        .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
    )
  : {};
const mailDir = mkdtempSync(join(tmpdir(), 'appchat-mail-'));
const env = {
  ...process.env,
  ...base,
  NODE_ENV: 'test',
  LOG_LEVEL: 'warn',
  API_PORT,
  MAIL_PROVIDER: 'console',
  MAIL_CONSOLE_DIR: mailDir,
  TAX_LOOKUP_PROVIDER: 'mock',
  COOKIE_SECURE: 'false',
  // Mã nhúng widget (TIP-017) trỏ về API của lượt E2E; API phục vụ /widget.js từ apps/widget/dist.
  WIDGET_API_URL: `http://localhost:${API_PORT}`,
  // Hộp thư kênh Email giả (TIP-018): API kiểm tra / kết nối, worker poll + gửi — không đăng nhập IMAP / SMTP thật.
  MAIL_TRANSPORT: 'fake',
  // Model giả (TIP-019, Q-001 chưa có key 9router): engine AI SDK thật, câu trả lời theo kịch bản.
  AI_ENGINE: 'mock',
};

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { stdio: 'inherit', shell: true, cwd: ROOT, ...opts });
if (!process.argv.includes('--no-build')) {
  const b = run('pnpm', ['turbo', 'run', 'build', '--filter=@appchat/api', '--filter=@appchat/worker', '--filter=@appchat/widget']);
  if (b.status !== 0) process.exit(b.status ?? 1);
}

const procs = [
  spawn('node', ['dist/main.js'], { cwd: join(ROOT, 'apps/api'), env, stdio: 'inherit' }),
  spawn('node', ['dist/main.js'], { cwd: join(ROOT, 'apps/worker'), env: { ...env, ROLE: 'jobs' }, stdio: 'inherit' }),
  // TIP-014: worker kênh với Zalo giả (Q-003 — chưa có tài khoản Zalo phụ): QR tự "quét" sau 1,5 giây, gửi không trễ.
  spawn('node', ['dist/main.js'], { cwd: join(ROOT, 'apps/worker'), env: { ...env, ROLE: 'channels', ZALO_TRANSPORT: 'fake', CHANNEL_SEND_JITTER: '0', ZALO_FAKE_GREETING: 'Chào shop, cho mình hỏi lịch hẹn', MAIL_FAKE_GREETING: 'Spa còn lịch chiều nay không ạ?' }, stdio: 'inherit' }),
];
const stop = () => {
  for (const p of procs) p.kill();
  rmSync(mailDir, { recursive: true, force: true });
};
process.on('SIGINT', () => {
  stop();
  process.exit(130);
});

// Chờ API sẵn sàng.
const deadline = Date.now() + 60_000;
for (;;) {
  try {
    if ((await fetch(`http://localhost:${API_PORT}/v1/health`)).ok) break;
  } catch {
    /* chưa lên */
  }
  if (Date.now() > deadline) {
    console.error('e2e:http — API không lên sau 60 giây');
    stop();
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 500));
}

const specs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const r = run('pnpm', ['exec', 'playwright', 'test', '--config', 'playwright.http.config.ts', ...specs], {
  cwd: join(ROOT, 'apps/web'),
  // Spec billing giả webhook ngân hàng nền tảng (/hooks/payments/mock) bằng cùng khoá HMAC với API (TIP-010).
  env: { ...process.env, API_URL: `http://localhost:${API_PORT}`, MAIL_CONSOLE_DIR: mailDir, MOCK_BANK_FEED_KEY: env.MOCK_BANK_FEED_KEY ?? 'mock-bank-feed-dev', PLATFORM_BANK_ACCOUNT_NO: env.PLATFORM_BANK_ACCOUNT_NO ?? '0071000888999' },
});
stop();
process.exit(r.status ?? 1);
