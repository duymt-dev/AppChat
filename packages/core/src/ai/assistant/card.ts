// Thẻ xác nhận của Trợ lý (FE `ConfirmEvent` — prototype L1260 ActionCard): dựng từ ActionDef + preview của executor. Handler có
// `preview` → tóm tắt của handler; chưa có → câu mặc định theo action (DC-128). Route / màu / icon theo đối tượng của action
// (đúng bảng màu module của prototype — fixture `assistant.json` intents) để nút "Đã lưu vào …" mở đúng màn.
import type { ActionDef, ActionPreview } from '@appchat/actions';
import type { ConfirmEventDto } from '@appchat/shared';
import { interpolate, serverMessages } from '@appchat/shared';
import { entityOf } from './catalog';

type Look = { route: string; color: string; icon: string };

/** Theo đối tượng (tiền tố id action); không có thì theo module. Màu = token prototype của từng module. */
const BY_ENTITY: Record<string, Look> = {
  quote: { route: '/quotes', color: '#C9820B', icon: 'ic-doc' },
  contract: { route: '/contracts', color: '#2563EB', icon: 'ic-doc' },
  order: { route: '/orders', color: '#1F9C4F', icon: 'ic-cart' },
  invoice: { route: '/invoices', color: '#0E9B94', icon: 'ic-dollar' },
  agent: { route: '/agents', color: '#0E9B7E', icon: 'ic-spark' },
  campaign: { route: '/marketing', color: '#DB2777', icon: 'ic-mega' },
  segment: { route: '/marketing', color: '#DB2777', icon: 'ic-mega' },
  ticket: { route: '/tickets', color: '#C9820B', icon: 'ic-ticket' },
  contact: { route: '/customers', color: '#2563EB', icon: 'ic-users' },
  appointment: { route: '/calendar', color: '#2563EB', icon: 'ic-cal' },
  product: { route: '/products', color: '#6E48E6', icon: 'ic-box' },
  category: { route: '/products', color: '#6E48E6', icon: 'ic-box' },
  stock: { route: '/products', color: '#6E48E6', icon: 'ic-box' },
  loyalty: { route: '/loyalty', color: '#C9820B', icon: 'ic-gift' },
  conversation: { route: '/inbox', color: '#1F9C4F', icon: 'ic-inbox' },
  message: { route: '/inbox', color: '#1F9C4F', icon: 'ic-inbox' },
  note: { route: '/inbox', color: '#1F9C4F', icon: 'ic-inbox' },
  ai_task: { route: '/assistant/cowork', color: '#6E48E6', icon: 'ic-bot' },
  kb: { route: '/settings/rag_data', color: '#0E9B7E', icon: 'ic-folder' },
  channel: { route: '/settings/channels', color: '#1F9C4F', icon: 'ic-link' },
  webchat: { route: '/settings/web_widget', color: '#1F9C4F', icon: 'ic-globe' },
};
const BY_MODULE: Record<string, Look> = {
  crm: BY_ENTITY.contact!,
  sales: BY_ENTITY.quote!,
  marketing: BY_ENTITY.campaign!,
  support: BY_ENTITY.ticket!,
  booking: BY_ENTITY.appointment!,
  catalog: BY_ENTITY.product!,
  inbox: BY_ENTITY.conversation!,
  ai: BY_ENTITY.agent!,
  loyalty: BY_ENTITY.loyalty!,
};
const FALLBACK: Look = { route: '/settings', color: '#6E48E6', icon: 'ic-cog' };

export const lookOf = (def: Pick<ActionDef, 'id' | 'module'>): Look => BY_ENTITY[entityOf(def.id)] ?? BY_MODULE[def.module] ?? FALLBACK;

/** Thẻ xác nhận phẳng cho FE (key = action, route / màu / icon theo đối tượng, tiêu đề "Tạo khách hàng", mô tả = preview). */
export function confirmCard(def: ActionDef, preview: ActionPreview | null, token: string, locale = 'vi'): ConfirmEventDto {
  const m = serverMessages(locale).ai.assistant;
  const look = lookOf(def);
  const verb = /\.create(_and_publish)?$/.test(def.id) ? m.verb.create : m.verb[def.risk];
  const entity = (m.entity as Record<string, string>)[entityOf(def.id)] ?? def.id;
  const dest = (m.module as Record<string, string>)[def.module] ?? def.module;
  const summary = preview?.summary?.trim();
  return {
    type: 'confirm',
    confirm_token: token,
    key: def.id,
    icon: look.icon,
    color: look.color,
    action_id: def.id,
    route: look.route,
    title: interpolate(m.card.title, { verb, entity }),
    desc: summary || interpolate(m.card.descEmpty, { action: def.id }),
    dest,
  };
}
