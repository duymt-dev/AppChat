// LibreOffice headless (templates.md §2, §8; Blueprint K8): HTML / DOCX → PDF. Mỗi lần chuyển một thư mục tạm riêng + hồ sơ người
// dùng riêng (`-env:UserInstallation`) để 2 tiến trình chạy song song không khoá nhau; quá 60 giây thì giết tiến trình. Chạy dưới user
// riêng, không mạng là việc của systemd ở VPS (Blueprint §11). Không có LibreOffice → lỗi `render_unavailable`.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { AppError } from '@appchat/shared';

export const RENDER_TIMEOUT_MS = 60_000;

const WIN_DEFAULT = 'C:\\Program Files\\LibreOffice\\program\\soffice.com';

/** Đường dẫn soffice: `SOFFICE_PATH` → bản cài mặc định Windows → `soffice` trong PATH (Linux). */
export const sofficePath = (src: Record<string, string | undefined>) =>
  src.SOFFICE_PATH || (process.platform === 'win32' && existsSync(WIN_DEFAULT) ? WIN_DEFAULT : 'soffice');

export interface PdfConverter {
  toPdf(input: Buffer, ext: 'html' | 'docx'): Promise<Buffer>;
  /** Một trang PDF (đã tách sẵn, do chính hệ thống render) → PNG A4 150 dpi (TIP-032b — báo giá dạng ảnh). */
  pageToPng?(pagePdf: Buffer): Promise<Buffer>;
}

/** A4 ở 150 dpi — đủ đọc chữ 10pt trên điện thoại, ảnh ~150–400 KB / trang. */
export const PAGE_PX = { width: 1240, height: 1754 };

export class SofficeConverter implements PdfConverter {
  constructor(
    private readonly bin: string,
    private readonly timeoutMs = RENDER_TIMEOUT_MS,
  ) {}

  async toPdf(input: Buffer, ext: 'html' | 'docx'): Promise<Buffer> {
    const dir = await mkdtemp(join(tmpdir(), 'appchat-render-'));
    try {
      const src = join(dir, `doc.${ext}`);
      await writeFile(src, input);
      const filter = 'pdf:writer_pdf_Export';
      await this.run(['--headless', '--norestore', '--nolockcheck', `-env:UserInstallation=${pathToFileURL(join(dir, 'profile')).href}`, '--convert-to', filter, '--outdir', join(dir, 'out'), src]);
      return await readFile(join(dir, 'out', 'doc.pdf')).catch(() => {
        throw new AppError('INTERNAL', 502, { render: 'failed' });
      });
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  async pageToPng(pagePdf: Buffer): Promise<Buffer> {
    const dir = await mkdtemp(join(tmpdir(), 'appchat-render-'));
    try {
      const src = join(dir, 'page.pdf');
      await writeFile(src, pagePdf);
      const size = JSON.stringify({ PixelWidth: { type: 'long', value: String(PAGE_PX.width) }, PixelHeight: { type: 'long', value: String(PAGE_PX.height) } });
      await this.run(['--headless', '--norestore', '--nolockcheck', `-env:UserInstallation=${pathToFileURL(join(dir, 'profile')).href}`, '--infilter=draw_pdf_import', '--convert-to', `png:draw_png_Export:${size}`, '--outdir', join(dir, 'out'), src]);
      return await readFile(join(dir, 'out', 'page.png')).catch(() => {
        throw new AppError('INTERNAL', 502, { render: 'failed' });
      });
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private run(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const p = spawn(this.bin, args, { stdio: 'ignore', windowsHide: true });
      const timer = setTimeout(() => {
        p.kill('SIGKILL');
        reject(new AppError('INTERNAL', 504, { render: 'timeout' }));
      }, this.timeoutMs);
      p.on('error', () => {
        clearTimeout(timer);
        reject(new AppError('NOT_IMPLEMENTED', 501, { render: 'render_unavailable' }));
      });
      p.on('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
}
