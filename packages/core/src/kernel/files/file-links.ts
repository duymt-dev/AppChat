// Gốc link ký tệp (TIP-025 / TIP-014b D): API public (cùng WIDGET_API_URL — origin API của widget / tệp, Blueprint §11) + APP_ENC_KEY.
// Domain đọc (inbox, crm) trả link ảnh / tệp mở được bằng thẻ <img> mà không cần access token.
export interface FileLinks {
  apiBase: string;
  key: Buffer;
}

/** Từ env (WIDGET_API_URL — mặc định như channels.env) + khoá; thiếu khoá → null (không trả link ảnh / tệp). */
export function fileLinksFrom(src: Record<string, string | undefined>, key: Buffer | undefined | null): FileLinks | null {
  return key ? { apiBase: (src.WIDGET_API_URL || 'http://localhost:4000').replace(/\/$/, ''), key } : null;
}
