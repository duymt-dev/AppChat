// State wizard tạo chiến dịch (4 bước) — prototype mkWiz* L8960–9024. Nguồn: thủ công · gợi ý AI (fromSuggestion) · Trợ lý (prefill).
// Người nhận = phân khúc đã lưu ∪ khách chọn tay (id thật của meta.customers) ∪ lô nhập (campaign.audience_import → audience_batch_id).
// Lưu nháp = campaign.create; Gửi duyệt = campaign.create rồi campaign.submit (luôn qua duyệt trước khi gửi — Blueprint §2.2). Lịch gửi
// gửi ISO có múi giờ (server kiểm tương lai). Số người nhận cuối là số server đếm (est_recipients) — FE chỉ hiện ước tính.
'use client';
import { useMemo, useState } from 'react';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import { useMarketingUi } from '../marketing-store';
import type { MarketingMeta, MkChannel, SendMode, Suggestion } from '../types';

export interface ImportBatch {
  id: string;
  name: string;
  rows: number;
  valid: number;
  invalid: number;
  duplicate: number;
}

export interface WizardDraft {
  step: number;
  channel: MkChannel;
  account_id: string;
  /** Email: `acc:<id>` | `mail:<connection>:<sender>` (TIP-012c — người gửi tường minh). */
  sender: string;
  q: string;
  group: string;
  segment_ids: string[];
  picked: string[];
  batch: ImportBatch | null;
  name: string;
  subject: string;
  body: string;
  send: SendMode;
  at: string;
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');
/** `datetime-local` (giờ máy) → ISO có offset — server từ chối giờ không múi. */
const isoLocal = (v: string) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  return `${v.length === 16 ? `${v}:00` : v}${sign}${pad(off / 60)}:${pad(off % 60)}`;
};

/** Người gửi gửi lên server: email chọn mail của DN → `sender` tenant_mail; còn lại tài khoản kênh như cũ. */
function senderInput(d: WizardDraft) {
  if (d.channel === 'email' && d.sender.startsWith('mail:')) {
    const [, connection_id, sender_id] = d.sender.split(':');
    return { sender: { kind: 'tenant_mail' as const, connection_id: connection_id!, sender_id: sender_id! } };
  }
  const acc = d.channel === 'email' && d.sender.startsWith('acc:') ? d.sender.slice(4) : d.account_id;
  return acc ? { account_id: acc } : {};
}

export function useWizard(meta: MarketingMeta, s: Suggestion | undefined, prefill: Record<string, unknown>) {
  const t = useTranslations('marketing.wiz');
  const { message } = App.useApp();
  const set = useMarketingUi((st) => st.set);
  const create = useAction<{ campaign_id: string; version?: number }>('campaign.create');
  const submit = useAction('campaign.submit');
  const channel = (s?.channel ?? (str(prefill.channel) || 'zalo')) as MkChannel;
  const [d, setD] = useState<WizardDraft>(() => ({
    step: 1,
    channel,
    account_id: meta.accounts.find((a) => a.type === (channel === 'zalo' ? 'zalo_personal' : 'email') && a.status === 'connected')?.id ?? '',
    sender: '',
    q: '',
    group: 'all',
    segment_ids: [],
    picked: [],
    batch: null,
    name: s?.title ?? str(prefill.name),
    subject: s?.subject ?? str(prefill.subject),
    body: s?.body ?? (str(prefill.text) || (t.raw('defaultBody') as string)),
    send: 'now',
    at: '',
  }));
  const patch = (p: Partial<WizardDraft>) =>
    setD((x) => {
      const next = { ...x, ...p };
      // Đổi kênh → tài khoản gửi đầu tiên đang kết nối của kênh mới.
      if (p.channel && p.channel !== x.channel) next.account_id = meta.accounts.find((a) => a.type === (p.channel === 'zalo' ? 'zalo_personal' : 'email') && a.status === 'connected')?.id ?? '';
      return next;
    });
  const segCount = (id: string) => meta.segments.find((x) => x[0] === id)?.[2] ?? 0;
  const audience = useMemo(
    () => (s ? s.est_count : 0) + d.segment_ids.reduce((n, id) => n + segCount(id), 0) + d.picked.length + (d.batch?.valid ?? 0),
    [s, d.segment_ids, d.picked.length, d.batch], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const q = d.q.toLowerCase();
  const visible = meta.customers.filter((c) => (d.group === 'all' || c.group === d.group) && (!q || [c.name, c.phone, c.email].some((v) => v.toLowerCase().includes(q))));
  const toggle = (id: string) => patch({ picked: d.picked.includes(id) ? d.picked.filter((x) => x !== id) : [...d.picked, id] });
  const selectAll = () => {
    const ids = visible.map((c) => c.id);
    const all = ids.every((id) => d.picked.includes(id));
    patch({ picked: all ? d.picked.filter((id) => !ids.includes(id)) : [...new Set([...d.picked, ...ids])] });
  };
  const close = () => set({ wizard: false, fromSuggestion: null, prefill: null });

  const save = async (andSubmit: boolean) => {
    if (!d.name.trim()) return void message.error(t('errName'));
    if (!s && !d.segment_ids.length && !d.picked.length && !d.batch) return void message.error(t('errAud'));
    if (!d.body.trim()) return void message.error(t('errBody'));
    if (d.send === 'schedule' && !d.at) return void message.error(t('errAt'));
    const r = await create.run({
      name: d.name.trim(),
      kind: s?.kind ?? 'manual',
      channel: d.channel,
      ...senderInput(d),
      ...(d.segment_ids.length ? { segment_ids: d.segment_ids } : {}),
      ...(d.picked.length ? { contact_ids: d.picked } : {}),
      ...(d.batch ? { audience_batch_id: d.batch.id } : {}),
      content: { text: d.body.trim(), ...(d.channel === 'email' && d.subject.trim() ? { subject: d.subject.trim() } : {}), ...(s?.cta ? { cta: s.cta } : {}) },
      send: d.send,
      ...(d.send === 'schedule' && d.at ? { scheduled_at: isoLocal(d.at) } : {}),
      ...(s ? { suggestion_id: s.id } : {}),
    });
    if (!r) return;
    if (andSubmit) await submit.run({ campaign_id: r.result.campaign_id }, { silent: true });
    close();
  };
  return { d, patch, audience, visible, toggle, selectAll, close, save, pending: create.isPending || submit.isPending };
}
