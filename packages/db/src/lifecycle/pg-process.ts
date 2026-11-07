// Chạy pg_dump / pg_restore cho vòng đời DB tenant (TIP-041 §2): `spawn` theo argv (không shell, không ghép chuỗi lệnh), tên DB đã kiểm
// ở lớp gọi, mật khẩu chỉ qua env của tiến trình con (PGPASSWORD) — không bao giờ nằm trong argv / log. Env con tối giản (không kế thừa
// toàn bộ process.env → không lộ bí mật khác của app). Lỗi trả mã + vài dòng stderr đã che, không in lệnh.
import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import type { Readable, Writable } from 'node:stream';

export interface PgConn {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

/** Kết nối tới `database` trên cluster của `url` (host thay theo registry nếu có). */
export function pgConnFromUrl(url: string, database: string, host?: string | null): PgConn {
  const u = new URL(url);
  return { host: host ?? u.hostname, port: u.port || '5432', user: decodeURIComponent(u.username), password: decodeURIComponent(u.password), database };
}

export class PgProcessError extends Error {
  constructor(
    readonly tool: string,
    readonly exitCode: number | null,
    detail: string,
  ) {
    super(`${tool} lỗi (${exitCode ?? 'signal'}): ${detail}`);
    this.name = 'PgProcessError';
  }
}

const PASS_ENV = ['PATH', 'Path', 'SYSTEMROOT', 'SystemRoot', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'LANG'];

/** Che chuỗi giống URL / mật khẩu trong stderr trước khi đưa vào lỗi (stderr pg thường không có mật khẩu — lớp bảo vệ thứ hai). */
export const redactPgStderr = (s: string, secret: string) =>
  s
    .split(secret || '\u0000')
    .join('***')
    .replace(/postgres(ql)?:\/\/\S+/g, 'postgresql://***')
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-4)
    .join(' | ')
    .slice(0, 400);

export function spawnPg(tool: 'pg_dump' | 'pg_restore', args: string[], conn: PgConn, binDir?: string): ChildProcess {
  const env: NodeJS.ProcessEnv = Object.fromEntries(PASS_ENV.filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]));
  Object.assign(env, { PGHOST: conn.host, PGPORT: conn.port, PGUSER: conn.user, PGPASSWORD: conn.password, PGDATABASE: conn.database, PGAPPNAME: `appchat-${tool}`, PGCONNECT_TIMEOUT: '10' });
  const bin = binDir ? join(binDir, tool) : tool;
  return spawn(bin, args, { env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
}

/**
 * Chạy tới khi xong: `stdin` (nếu có) bơm vào tiến trình, stdout đẩy tới `stdout` (nếu có) hoặc gom lại thành chuỗi. Huỷ được bằng
 * `signal` (mất khoá / hết lease → kill tiến trình con, không chạy tiếp). Mã thoát ≠ 0 → PgProcessError.
 */
export function runPg(
  tool: 'pg_dump' | 'pg_restore',
  args: string[],
  conn: PgConn,
  o: { binDir?: string; stdin?: Readable; stdout?: Writable; signal?: AbortSignal } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (o.signal?.aborted) return reject(new PgProcessError(tool, null, 'aborted'));
    const child = spawnPg(tool, args, conn, o.binDir);
    let err = '';
    let out = '';
    let settled = false;
    const fail = (e: Error) => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(e);
    };
    const onAbort = () => fail(new PgProcessError(tool, null, 'aborted'));
    o.signal?.addEventListener('abort', onAbort, { once: true });
    child.stderr!.on('data', (d: Buffer) => (err = (err + d.toString('utf8')).slice(-4000)));
    if (o.stdout) child.stdout!.pipe(o.stdout);
    else child.stdout!.on('data', (d: Buffer) => (out += d.toString('utf8')));
    child.on('error', (e) => fail(new PgProcessError(tool, null, e.message)));
    if (o.stdin) {
      o.stdin.on('error', (e) => fail(e));
      child.stdin!.on('error', () => undefined);
      o.stdin.pipe(child.stdin!);
    } else child.stdin!.end();
    child.on('close', (code) => {
      o.signal?.removeEventListener('abort', onAbort);
      if (settled) return;
      settled = true;
      if (code === 0) resolve(out);
      else reject(new PgProcessError(tool, code, redactPgStderr(err, conn.password)));
    });
  });
}
