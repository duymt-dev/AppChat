// Widget chat website (TIP-017, REQ-B05; Blueprint §2.2 `webchat_widget`, §3.4 `webchat.update_widget`): đọc cấu hình cho Cài đặt ›
// Trợ lý AI website (`GET /v1/settings/widget`), dựng / cập nhật widget + tài khoản webchat, mã nhúng, kiểm domain nhúng.
import { randomBytes } from 'node:crypto';
import { serverMessages, WIDGET_COLLECT, WIDGET_KNOWLEDGE, type WidgetSettingsDto } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';

/** Cấu hình AI / nút hành động của widget (cột `settings` jsonb). */
export interface WidgetConfig {
  ai_chat: boolean;
  ai_on: boolean;
  handoff: number;
  tone: 'friendly' | 'professional' | 'brief';
  mode: 'auto' | 'human' | 'hybrid';
  knowledge_on: string[];
  collect_on: string[];
  actions: { key: string; color: string; on: boolean }[];
}

export interface Prechat {
  enabled: boolean;
  fields: ('name' | 'phone' | 'email')[];
}

export const DEFAULT_COLOR = '#2DC56A';
const DEFAULT_PRECHAT: Prechat = { enabled: true, fields: ['name', 'phone'] };

/** Mặc định theo prototype L7184 (nút hành động "Đặt hàng" / "Câu hỏi thường gặp" tắt sẵn). */
export function defaultConfig(): WidgetConfig {
  return {
    ai_chat: true,
    ai_on: true,
    handoff: 70,
    tone: 'friendly',
    mode: 'hybrid',
    knowledge_on: ['catalog', 'price', 'faq'],
    collect_on: ['lead', 'ticket', 'answer'],
    actions: [
      { key: 'order', color: '#C9820B', on: false },
      { key: 'faq', color: '#0E9B94', on: false },
    ],
  };
}

export type WidgetRow = NonNullable<Awaited<ReturnType<TenantDb['webchatWidget']['findUnique']>>>;

export const configOf = (w: Pick<WidgetRow, 'settings'>): WidgetConfig => ({ ...defaultConfig(), ...((w.settings ?? {}) as Partial<WidgetConfig>) });
export const prechatOf = (w: Pick<WidgetRow, 'prechatForm'>): Prechat => ({ ...DEFAULT_PRECHAT, ...((w.prechatForm ?? {}) as Partial<Prechat>) });
export const colorOf = (w: Pick<WidgetRow, 'theme'>): string => ((w.theme ?? {}) as { color?: string }).color ?? DEFAULT_COLOR;

/** `public_key` công khai trong mã nhúng: `wk_` + 24 ký tự base64url (không đoán được — tra `tenant_widget_route`). */
export const newPublicKey = () => `wk_${randomBytes(18).toString('base64url')}`;

export interface WidgetUrls {
  /** URL file `widget.js` (CDN / nginx `widget.<domain>`). */
  script: string;
  /** Gốc API mà widget nối Socket.IO `/widget`. */
  api: string;
}

export function embedCode(publicKey: string, urls: WidgetUrls): string {
  return `<script src="${urls.script}" async\n  data-key="${publicKey}"\n  data-api="${urls.api}"></script>`;
}

/**
 * Origin trang nhúng có thuộc `allowed_domains` không (Blueprint §6 "chỉ chạy trên allowed_domains"). Rỗng = chưa giới hạn
 * (DC-088). Mẫu `spa.vn` khớp đúng host (+ cổng nếu ghi), `*.spa.vn` khớp mọi tên miền con và chính `spa.vn`.
 */
export function originAllowed(origin: string | undefined, allowed: string[]): boolean {
  if (!allowed.length) return true;
  if (!origin) return false;
  let host: string;
  try {
    host = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }
  const bare = host.replace(/:\d+$/, '');
  return allowed.some((p) => {
    const pat = p.toLowerCase();
    const target = /:\d+$/.test(pat) ? host : bare;
    if (pat.startsWith('*.')) {
      const root = pat.slice(2);
      return target === root || target.endsWith(`.${root}`);
    }
    return target === pat;
  });
}

/** KPI trang Cài đặt (prototype "Lượt click / Hội thoại mới / Tỉ lệ / Widget đang chạy") từ dữ liệu thật. */
async function kpis(db: TenantDb | TenantTx, accountId: string | null, running: boolean) {
  if (!accountId) return { clicks: 0, chats: 0, running: 0, total: 0 };
  const [clicks, chats] = await Promise.all([
    db.webchatVisitor.count({ where: { channelAccountId: accountId } }),
    db.conversation.count({ where: { channelAccountId: accountId } }),
  ]);
  return { clicks, chats, running: running ? 1 : 0, total: 1 };
}

/** `GET /v1/settings/widget` — chưa bật lần nào thì trả mặc định (`enabled: false`, chưa có mã nhúng). */
export async function widgetSettings(db: TenantDb | TenantTx, urls: WidgetUrls, locale = 'vi'): Promise<WidgetSettingsDto> {
  const w = await db.webchatWidget.findFirst({ orderBy: { createdAt: 'asc' } });
  const t = serverMessages(locale).channels.widget;
  const acc = w ? await db.channelAccount.findUnique({ where: { id: w.channelAccountId }, select: { id: true, status: true, pausedAt: true } }) : null;
  const live = !!acc && acc.status !== 'disconnected';
  const running = live && acc.status === 'connected' && !acc.pausedAt;
  const cfg = w ? configOf(w) : defaultConfig();
  return {
    enabled: running,
    channel_account_id: live ? acc.id : null,
    public_key: w?.publicKey ?? null,
    name: w?.name ?? t.name,
    greeting: w?.greeting ?? t.greeting,
    color: w ? colorOf(w) : DEFAULT_COLOR,
    allowed_domains: w?.allowedDomains ?? [],
    ai_chat: cfg.ai_chat,
    prechat: w ? prechatOf(w).enabled : DEFAULT_PRECHAT.enabled,
    actions: cfg.actions,
    ai_on: cfg.ai_on,
    // Danh sách AI Agent = bảng ai_agent (TIP-021); tới lúc đó chỉ có agent đã chọn (DC-076).
    agents: w?.agentId ? [w.agentId] : [],
    agent: w?.agentId ?? '',
    handoff: cfg.handoff,
    knowledge: [...WIDGET_KNOWLEDGE],
    knowledge_on: cfg.knowledge_on,
    tone: cfg.tone,
    mode: cfg.mode,
    collect: [...WIDGET_COLLECT],
    collect_on: cfg.collect_on,
    kpis: await kpis(db, live ? acc.id : null, running),
    embed: w ? embedCode(w.publicKey, urls) : '',
  };
}
