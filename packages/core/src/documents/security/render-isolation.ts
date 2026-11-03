// Đổi DOCX KHÁCH / NGƯỜI DÙNG TẢI LÊN sang PDF trong môi trường cô lập (TIP-030b spec 6; DC-321). Đầu vào không tin cậy nên KHÔNG gọi
// soffice trực tiếp: phải qua launcher cô lập do máy cấu hình (`RENDER_ISOLATION_LAUNCHER` — tools/sandbox/render-linux.sh dùng
// systemd-run PrivateNetwork / NoNewPrivileges / giới hạn bộ nhớ-tiến trình; render-windows.ps1 dùng Job Object giới hạn + kill-on-close).
// Chưa cấu hình / launcher không tồn tại → đóng an toàn 501 `render_isolation_unavailable` (không có bản PDF để ký, không ngầm chạy
// không cô lập). Không cờ dòng lệnh nào của soffice tự là sandbox. Hết giờ (60 giây) → giết cả cây tiến trình; chỉ xoá thư mục tạm do
// chính mình tạo (đã kiểm tiền tố). Tối đa 2 lần đổi cùng lúc.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { AppError } from '@appchat/shared';
import { RENDER_TIMEOUT_MS } from '../services/soffice';

export const ISOLATED_CONCURRENCY = 2;
/** Token DI: `LauncherConverter` theo env (null launcher = đóng an toàn 501). */
export const ISOLATED_CONVERTER = Symbol('ISOLATED_CONVERTER');
const PREFIX = 'appchat-isolated-';

export interface IsolatedConverter {
  docxToPdf(input: Buffer): Promise<Buffer>;
}

/**
 * Launcher cô lập từ env; vắng / không tồn tại → null (caller đóng an toàn). `RENDER_ISOLATION_WINDOWS_MODE=job-dev` (Windows chỉ Job
 * Object, KHÔNG cô lập mạng — DV-024) bị từ chối ở production.
 */
export function isolationLauncher(src: Record<string, string | undefined>): string | null {
  const p = src.RENDER_ISOLATION_LAUNCHER?.trim();
  if (src.NODE_ENV === 'production' && src.RENDER_ISOLATION_WINDOWS_MODE === 'job-dev') return null;
  return p && existsSync(p) ? p : null;
}

/** Giết cả cây tiến trình (Windows: taskkill /T; POSIX: nhóm tiến trình). */
function killTree(pid: number | undefined) {
  if (!pid) return;
  if (process.platform === 'win32') spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  else {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      /* đã thoát */
    }
  }
}

export class LauncherConverter implements IsolatedConverter {
  private running = 0;
  private readonly waiting: (() => void)[] = [];

  constructor(
    private readonly launcher: string | null,
    private readonly soffice: string,
    private readonly timeoutMs = RENDER_TIMEOUT_MS,
  ) {}

  async docxToPdf(input: Buffer): Promise<Buffer> {
    if (!this.launcher) throw new AppError('NOT_IMPLEMENTED', 501, { render: 'render_isolation_unavailable' });
    await this.acquire();
    const root = await mkdtemp(join(tmpdir(), PREFIX));
    try {
      await writeFile(join(root, 'in.docx'), input);
      await this.run([this.soffice, root, String(Math.ceil(this.timeoutMs / 1000))]);
      return await readFile(join(root, 'out', 'in.pdf')).catch(() => {
        throw new AppError('INTERNAL', 502, { render: 'failed' });
      });
    } finally {
      // Chỉ xoá đúng thư mục tạm của mình (tiền tố + nằm trong tmpdir).
      const abs = resolve(root);
      if (abs.startsWith(resolve(tmpdir()) + sep) && abs.split(sep).pop()!.startsWith(PREFIX)) await rm(abs, { recursive: true, force: true }).catch(() => undefined);
      this.release();
    }
  }

  private run(args: string[]): Promise<void> {
    const shell = this.launcher!.endsWith('.ps1') ? ['powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', this.launcher!, ...args]] : [this.launcher!, args];
    return new Promise((ok, fail) => {
      const p = spawn(shell[0] as string, shell[1] as string[], { stdio: 'ignore', windowsHide: true, detached: process.platform !== 'win32' });
      const timer = setTimeout(() => {
        killTree(p.pid);
        fail(new AppError('INTERNAL', 504, { render: 'timeout' }));
      }, this.timeoutMs + 5_000);
      p.on('error', () => {
        clearTimeout(timer);
        fail(new AppError('NOT_IMPLEMENTED', 501, { render: 'render_isolation_unavailable' }));
      });
      p.on('exit', (code) => {
        clearTimeout(timer);
        if (code === 0) ok();
        else fail(new AppError('INTERNAL', code === 124 ? 504 : 502, { render: code === 124 ? 'timeout' : 'failed' }));
      });
    });
  }

  private acquire(): Promise<void> {
    if (this.running < ISOLATED_CONCURRENCY) {
      this.running++;
      return Promise.resolve();
    }
    return new Promise((r) => this.waiting.push(() => (this.running++, r())));
  }

  private release() {
    this.running--;
    this.waiting.shift()?.();
  }
}
