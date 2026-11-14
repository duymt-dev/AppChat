// Registry mở rộng tệp đính kèm của Trợ lý (TIP-023c 8c): 023c chỉ sở hữu chọn / tải / guard; domain đăng ký "extension" đọc tệp sau
// (038b importer / exporter, 030b…) — registry KHÔNG import domain nào. Mỗi extension khai purpose / mime nhận, và chỉ nhận tệp ĐÃ qua
// guard (kernel/files/file-access). Không có extension khớp → tệp chỉ là tên trong ngữ cảnh lượt (model không đọc nội dung).
import type { GrantedFile } from '../../../kernel/files/file-access';

export interface AttachmentExtension {
  /** Khoá duy nhất, vd. `crm.import`. */
  key: string;
  /** Mime nhận (đầy đủ hoặc tiền tố `image/`). */
  mimes: readonly string[];
  /** Mô tả ngắn cho prompt (model biết có thể làm gì với tệp). Không chứa dữ liệu tệp. */
  hint: string;
}

const extensions = new Map<string, AttachmentExtension>();

export function registerAttachmentExtension(e: AttachmentExtension): void {
  if (extensions.has(e.key) && extensions.get(e.key) !== e) throw new Error(`Trùng attachment extension: ${e.key}`);
  extensions.set(e.key, e);
}

/** Gỡ đăng ký — chỉ dùng trong test. */
export const unregisterAttachmentExtension = (key: string): boolean => extensions.delete(key);

/** Extension nhận được tệp (theo mime). */
export const extensionsFor = (f: Pick<GrantedFile, 'mime'>): AttachmentExtension[] =>
  [...extensions.values()].filter((e) => e.mimes.some((m) => (m.endsWith('/') ? f.mime.startsWith(m) : f.mime === m)));
