// Chữ phía server theo locale người nhận (standards/i18n §8): email, thông báo. vi là nguồn; locale chưa có bản dịch
// đi theo chuỗi fallback (fallbackChain) — hiện chỉ vi + en.
import { fallbackChain } from '../locales';
import { ai as enAi } from './en/ai';
import { billing as enBilling } from './en/billing';
import { catalog as enCatalog } from './en/catalog';
import { channels as enChannels } from './en/channels';
import { crm as enCrm } from './en/crm';
import { documents as enDocuments } from './en/documents';
import { inbox as enInbox } from './en/inbox';
import { notify as enNotify } from './en/notify';
import { sales as enSales } from './en/sales';
import { ai as viAi } from './vi/ai';
import { billing as viBilling } from './vi/billing';
import { catalog as viCatalog } from './vi/catalog';
import { channels as viChannels } from './vi/channels';
import { crm as viCrm } from './vi/crm';
import { documents as viDocuments } from './vi/documents';
import { inbox as viInbox } from './vi/inbox';
import { notify as viNotify } from './vi/notify';
import { sales as viSales } from './vi/sales';

interface Bundle {
  notify: typeof enNotify;
  billing: typeof enBilling;
  crm: typeof enCrm;
  channels: typeof enChannels;
  inbox: typeof enInbox;
  ai: typeof enAi;
  catalog: typeof enCatalog;
  documents: typeof enDocuments;
  sales: typeof enSales;
}

const BUNDLES: Record<string, Bundle> = {
  vi: { notify: viNotify, billing: viBilling, crm: viCrm, channels: viChannels, inbox: viInbox, ai: viAi, catalog: viCatalog, documents: viDocuments, sales: viSales },
  en: { notify: enNotify, billing: enBilling, crm: enCrm, channels: enChannels, inbox: enInbox, ai: enAi, catalog: enCatalog, documents: enDocuments, sales: enSales },
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
