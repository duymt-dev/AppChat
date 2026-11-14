// Cấu hình link của báo giá: origin web (APP_PUBLIC_URL — trang xem công khai `/q/<token>`), origin API (WIDGET_API_URL — link tệp
// PDF ký gửi kèm tin) + khoá chủ APP_ENC_KEY. Thiếu khoá → null (gửi báo giá trả 501, như tệp đính kèm tin nhắn — TIP-025).
import { signedFileUrl } from '../../../kernel/files/signed-url';
import { quoteUrl, type QuoteLinks } from './quote-link';

export const QUOTE_ENV = Symbol('QUOTE_ENV');

export interface QuoteEnv extends QuoteLinks {
  apiBase: string;
}

export function quoteEnvFor(src: Record<string, string | undefined>, key: Buffer | undefined, apiBase: string): QuoteEnv | null {
  if (!key) return null;
  return { appBase: (src.APP_PUBLIC_URL ?? 'http://localhost:3000').replace(/\/$/, ''), apiBase, key };
}

export const quoteLinkOf = (e: QuoteEnv, ws: string, quoteId: string) => quoteUrl(e, ws, quoteId);
export const pdfLinkOf = (e: QuoteEnv, ws: string, fileId: string) => signedFileUrl(e.apiBase, e.key, ws, fileId);
