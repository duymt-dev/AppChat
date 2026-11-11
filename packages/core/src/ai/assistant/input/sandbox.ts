// Chạy parser trong tiến trình con cô lập (TIP-023f §2.1): node `--permission` (không ghi đĩa, không tiến trình con / worker / binding,
// chỉ đọc đúng thư mục bundle parser), env sạch (không DB / storage / provider), mạng chặn ở tầng module (parse-worker.ts), stdin /
// stdout có trần, 30s / tệp, RSS ≤ 128 MiB do cha đo và giết cả cây khi vượt. Trần bộ nhớ CỨNG + chặn mạng ở tầng OS là launcher
// native (infra/parser: JobObject + AppContainer trên Windows, systemd cgroup + netns trên Linux) — cấu hình qua PARSER_LAUNCHER;
// thiếu bundle parser → PARSER_ISOLATION_UNAVAILABLE, KHÔNG BAO GIỜ parse trong tiến trình chính.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { INPUT_ERROR_REASONS, INPUT_MAX_FILE_BYTES, type InputErrorReason, type InputKind } from '@appchat/shared';
import { CHILD_SRC } from './parse-worker';
import type { ParsedPart } from './parse-bounds';

export const SANDBOX_LIMITS: { timeoutMs: number; rssBytes: number; stdoutBytes: number } = { timeoutMs: 30_000, rssBytes: 128 * 1024 * 1024, stdoutBytes: 8 * 1024 * 1024 };

export type SandboxResult = { ok: true; kind: InputKind; parts: ParsedPart[] } | { ok: false; reason: InputErrorReason };

export interface SandboxConfig {
  /** Bundle CJS export `extractInput` (dist/parser.cjs của worker). */
  entry: string | null;
  /** Launcher native (run.ps1 / run.sh) — vắng → node --permission trực tiếp (vẫn có trần RSS do cha đo). */
  launcher?: string | null;
  limits?: Partial<typeof SANDBOX_LIMITS>;
}

const asReason = (r: unknown): InputErrorReason => ((INPUT_ERROR_REASONS as readonly string[]).includes(String(r)) ? (r as InputErrorReason) : 'corrupt');

/** Tham số do server sở hữu: không ghép chuỗi shell, tên tệp chỉ dùng làm gợi ý đuôi (đã cắt, không phải đường dẫn). */
function command(c: SandboxConfig, entry: string, name: string): { file: string; args: string[] } {
  const node = ['--permission', `--allow-fs-read=${dirname(entry)}`, '--max-old-space-size=96', '-e', CHILD_SRC, entry, String(INPUT_MAX_FILE_BYTES), name.slice(-40).replace(/[^\w.\-]/g, '_')];
  if (!c.launcher) return { file: process.execPath, args: node };
  return c.launcher.endsWith('.ps1')
    ? { file: 'powershell.exe', args: ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-File', c.launcher, process.execPath, ...node] }
    : { file: c.launcher, args: [process.execPath, ...node] };
}

export function parseIsolated(c: SandboxConfig, body: Buffer, name: string): Promise<SandboxResult> {
  const lim = { ...SANDBOX_LIMITS, ...c.limits };
  if (!c.entry || !existsSync(c.entry)) return Promise.resolve({ ok: false, reason: 'parser_isolation_unavailable' });
  const { file, args } = command(c, c.entry, name);
  return new Promise((done) => {
    const child = spawn(file, args, { env: { SystemRoot: process.env.SystemRoot ?? '', PATH: '' }, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, detached: process.platform !== 'win32' });
    let out = '';
    let settled = false;
    const finish = (r: SandboxResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      kill(child.pid);
      done(r);
    };
    const timer = setTimeout(() => finish({ ok: false, reason: 'timeout' }), lim.timeoutMs);
    child.stdout.on('data', (b: Buffer) => {
      out += b.toString('utf8');
      if (out.length > lim.stdoutBytes) finish({ ok: false, reason: 'too_large' });
    });
    child.stderr.on('data', (b: Buffer) => {
      const m = /rss:(\d+)/.exec(b.toString('latin1'));
      if (m && Number(m[1]) > lim.rssBytes) finish({ ok: false, reason: 'too_large' });
    });
    child.on('error', () => finish({ ok: false, reason: 'parser_isolation_unavailable' }));
    child.on('close', () => {
      const line = out.trim().split('\n').pop() ?? '';
      try {
        const r = JSON.parse(line) as { kind?: InputKind; parts?: ParsedPart[]; error?: string };
        finish(r.error || !r.kind ? { ok: false, reason: asReason(r.error) } : { ok: true, kind: r.kind, parts: r.parts ?? [] });
      } catch {
        finish({ ok: false, reason: 'corrupt' });
      }
    });
    child.stdin.on('error', () => undefined);
    child.stdin.end(body);
  });
}

/** Giết cả cây: Windows taskkill /T, POSIX nhóm tiến trình (detached → pid âm). */
function kill(pid: number | undefined): void {
  if (!pid) return;
  try {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else process.kill(-pid, 'SIGKILL');
  } catch {
    // Tiến trình đã thoát.
  }
}
