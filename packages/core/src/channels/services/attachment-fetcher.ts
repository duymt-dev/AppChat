// Tải tệp đính kèm khi gửi qua kênh (TIP-045b annex B): adapter (Zalo, SMTP) không tự `fetch` URL. Link ký nội bộ
// `<API>/v1/files/<id>/raw?ws=&sig=` (đúng origin API + đúng route + chữ ký HMAC hợp lệ) → đọc thẳng Storage qua bảng `file` của đúng
// workspace — không gọi HTTP về localhost, không cần miễn trừ SSRF cho mạng nội bộ. URL ngoài (media khách / nhà cung cấp) → safeFetch
// (chặn địa chỉ nội bộ, redirect, DNS rebinding) và cắt ở 25MB. Không có Storage / khoá → chỉ đường ngoài; link ký mà không đọc được → lỗi.
import type { FileFetcher } from '@appchat/channels';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { FilesService } from '../../kernel/files/files.service';
import { parseSignedFileUrl } from '../../kernel/files/signed-url';
import { safeFetch, type SafeFetchOptions } from '../../kernel/http/safe-fetch';

/** Trần một tệp đính kèm gửi ra kênh (annex B: media ≤ 25MB). */
export const ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

export interface AttachmentFetcherDeps {
  apiBase: string;
  key: Buffer | null;
  tenants: TenantDbResolver | null;
  files: FilesService | null;
  /** Tuỳ chọn safeFetch (test: resolver giả). */
  fetchOptions?: SafeFetchOptions;
}

export function attachmentFetcher(d: AttachmentFetcherDeps): FileFetcher {
  return async (url) => {
    const own = d.key ? parseSignedFileUrl(url, d.apiBase, d.key) : null;
    if (own) {
      if (!d.tenants || !d.files) throw new Error('attachment_storage_unavailable');
      const db = await d.tenants.get(TenantContexts.system(own.ws, 'channels.attachment'));
      const f = await d.files.read(db, own.fileId);
      if (!f) throw new Error('attachment_not_found');
      if (f.body.length > ATTACHMENT_MAX_BYTES) throw new Error('attachment_too_large');
      return f.body;
    }
    let r: Awaited<ReturnType<typeof safeFetch>>;
    try {
      r = await safeFetch(url, { timeoutMs: 30_000, ...d.fetchOptions, maxBytes: ATTACHMENT_MAX_BYTES });
    } catch (e) {
      const reason = (e as Error).message;
      throw new Error(reason.includes('too_large') ? 'attachment_too_large' : `attachment_refused:${reason.replace(/^[a-z_]+:/, '')}`);
    }
    if (r.status < 200 || r.status >= 300) throw new Error(`attachment_http_${r.status}`);
    return r.body;
  };
}
