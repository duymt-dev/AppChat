// Chữ phía server theo locale người nhận (standards/i18n §8): email, thông báo. vi là nguồn; locale chưa có bản dịch
// đi theo chuỗi fallback (fallbackChain) — hiện chỉ vi + en.
import { fallbackChain } from '../locales';
import { billing as enBilling } from './en/billing';
import { crm as enCrm } from './en/crm';
import { notify as enNotify } from './en/notify';
import { billing as viBilling } from './vi/billing';
import { crm as viCrm } from './vi/crm';
import { notify as viNotify } from './vi/notify';

interface Bundle {
  notify: typeof enNotify;
  billing: typeof enBilling;
  crm: typeof enCrm;
}

const BUNDLES: Record<string, Bundle> = {
  vi: { notify: viNotify, billing: viBilling, crm: viCrm },
  en: { notify: enNotify, billing: enBilling, crm: enCrm },
};

/** Bộ chữ server của locale (theo fallback, cuối cùng là vi). */
export function serverMessages(locale: string | null | undefined) {
  for (const l of fallbackChain(locale ?? 'vi')) if (BUNDLES[l]) return BUNDLES[l]!;
  return BUNDLES.vi!;
}

/** Thay `{name}` bằng params; `escape` cho HTML. Tham số thiếu giữ nguyên `{name}` để dễ phát hiện khi test. */
export function interpolate(tpl: string, params: Record<string, string | number>, escape?: (s: string) => string): string {
  return tpl.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? (escape ? escape(String(params[k])) : String(params[k])) : m));
}
