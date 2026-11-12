// Kiểm cấu trúc tệp đính kèm bản ghi trong tiến trình con cô lập (TIP-032d §2.1): `node --permission` (chỉ đọc thư mục bundle, không ghi /
// không tiến trình con / không worker), env sạch, mạng chặn ở tầng module, 30 s / tệp, RSS ≤ 128 MiB (cha đo, giết cả cây khi vượt), ≤ 2
// lượt / worker và 1 / tenant (khoá ở người gọi). Thiếu bundle → `isolation_unavailable` — KHÔNG BAO GIỜ kiểm trong tiến trình chính.
// Trạng thái chỉ là "hợp lệ về cấu trúc" — không có trạng thái "đã quét virus". Không import AI parser / KB ingest (module trung lập kernel).
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { MAX_UPLOAD_BYTES } from './storage';
import type { ValidationReason } from './attachment-validator-entry';

export { VALIDATOR_VERSION, RECORD_ATTACHMENT_KINDS } from './attachment-validator-entry';

export const VALIDATION_LIMITS = { timeoutMs: 30_000, rssBytes: 128 * 1024 * 1024, perWorker: 2 } as const;

export type IsolatedValidation = { ok: true; kind: string } | { ok: false; reason: ValidationReason | 'timeout' | 'too_large' | 'isolation_unavailable' };

/** Chặn mạng / tiến trình con ở tầng module rồi gọi `validateAttachment` của bundle; một dòng JSON ra stdout; báo RSS định kỳ. */
const CHILD = String.raw`
const Module = require('node:module');
const deny = () => { throw Object.assign(new Error('network_denied'), { code: 'NETWORK_DENIED' }); };
const BLOCK = new Set(['net','node:net','tls','node:tls','dns','node:dns','dns/promises','node:dns/promises','http','node:http','https','node:https','http2','node:http2','dgram','node:dgram','child_process','node:child_process','worker_threads','node:worker_threads','inspector','node:inspector']);
const load = Module._load;
Module._load = function (req, parent, isMain) { if (BLOCK.has(req)) return new Proxy({}, { get: (_t, k) => (k === '__esModule' ? false : deny) }); return load.call(this, req, parent, isMain); };
globalThis.fetch = deny;
const tick = setInterval(() => process.stderr.write('rss:' + process.memoryUsage().rss + '\n'), 100);
const chunks = []; let size = 0; const max = Number(process.argv[2]);
process.stdin.on('data', (c) => { size += c.length; if (size > max) { process.stdout.write(JSON.stringify({ error: 'too_large' }) + '\n'); process.exit(3); } chunks.push(c); });
process.stdin.on('end', () => {
  try { const r = require(process.argv[1]).validateAttachment(Buffer.concat(chunks), process.argv[3] || ''); process.stdout.write(JSON.stringify(r) + '\n'); }
  catch (e) { process.stdout.write(JSON.stringify({ ok: false, reason: 'corrupt' }) + '\n'); }
  clearInterval(tick); process.exit(0);
});
`;

/** Bundle validator mặc định: cạnh entry tiến trình (dist/main.js → dist/attachment-validator.cjs của api / worker). */
export function validatorEntry(env: NodeJS.ProcessEnv = process.env, main = process.argv[1] ?? ''): string | null {
  if (env.ATTACHMENT_VALIDATOR_ENTRY) return env.ATTACHMENT_VALIDATOR_ENTRY;
  const near = join(dirname(main), 'attachment-validator.cjs');
  return existsSync(near) ? near : null;
}

let running = 0;

/** Kiểm một tệp trong tiến trình con. `entry` null / không tồn tại → isolation_unavailable (không fallback trong tiến trình). */
export async function validateIsolated(entry: string | null, body: Buffer, name: string, limits: Partial<Record<keyof typeof VALIDATION_LIMITS, number>> = {}): Promise<IsolatedValidation> {
  const lim = { ...VALIDATION_LIMITS, ...limits };
  if (!entry || !existsSync(entry)) return { ok: false, reason: 'isolation_unavailable' };
  if (running >= lim.perWorker) return { ok: false, reason: 'isolation_unavailable' };
  running++;
  try {
    return await new Promise<IsolatedValidation>((done) => {
      const args = ['--permission', `--allow-fs-read=${dirname(entry)}`, '--max-old-space-size=96', '-e', CHILD, entry, String(MAX_UPLOAD_BYTES), name.slice(-40).replace(/[^\w.\-]/g, '_')];
      const child = spawn(process.execPath, args, { env: { SystemRoot: process.env.SystemRoot ?? '', PATH: '' }, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, detached: process.platform !== 'win32' });
      let out = '';
      let settled = false;
      const finish = (r: IsolatedValidation) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        kill(child.pid);
        done(r);
      };
      const timer = setTimeout(() => finish({ ok: false, reason: 'timeout' }), lim.timeoutMs);
      child.stdout.on('data', (b: Buffer) => {
        out += b.toString('utf8');
        if (out.length > 64 * 1024) finish({ ok: false, reason: 'too_large' });
      });
      child.stderr.on('data', (b: Buffer) => {
        const m = /rss:(\d+)/.exec(b.toString('latin1'));
        if (m && Number(m[1]) > lim.rssBytes) finish({ ok: false, reason: 'too_large' });
      });
      child.on('error', () => finish({ ok: false, reason: 'isolation_unavailable' }));
      child.on('close', () => {
        try {
          const r = JSON.parse(out.trim().split('\n').pop() ?? '') as { ok?: boolean; kind?: string; reason?: ValidationReason; error?: string };
          finish(r.ok && r.kind ? { ok: true, kind: r.kind } : { ok: false, reason: r.error === 'too_large' ? 'too_large' : (r.reason ?? 'corrupt') });
        } catch {
          finish({ ok: false, reason: 'corrupt' });
        }
      });
      child.stdin.on('error', () => undefined);
      child.stdin.end(body);
    });
  } finally {
    running--;
  }
}

/** Giết cả cây: Windows taskkill /T, POSIX nhóm tiến trình. */
function kill(pid: number | undefined): void {
  if (!pid) return;
  try {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else process.kill(-pid, 'SIGKILL');
  } catch {
    // đã thoát
  }
}
