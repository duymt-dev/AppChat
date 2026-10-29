// State wizard tạo chiến dịch (4 bước) — prototype mkWiz* L8960–9024. Nguồn: thủ công · đề xuất AI (fromSuggestion) · Trợ lý (prefill).
// Lưu nháp = campaign.create; Gửi duyệt = campaign.create rồi campaign.submit (luôn qua duyệt trước khi gửi — Blueprint §2.2).
'use client';
import { useMemo, useState } from 'react';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import { useMarketingUi } from '../marketing-store';
import type { MarketingMeta, MkChannel, SendMode, Suggestion } from '../types';

export interface WizardDraft {
  step: number;
  channel: MkChannel;
  q: string;
  group: string;
  picked: number[];
  uploaded: boolean;
  name: string;
  subject: string;
  body: string;
  send: SendMode;
  at: string;
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');
/** Số liên hệ hợp lệ của file Excel mẫu (prototype mkWizDoUpload: 1.248 dòng · 1.180 hợp lệ). */
const UPLOAD_VALID = 1180;
const IMPORT_ID = 'import_xlsx';
export const contactId = (i: number) => `ct_${i + 1}`;

export function useWizard(meta: MarketingMeta, s: Suggestion | undefined, prefill: Record<string, unknown>) {
  const t = useTranslations('marketing.wiz');
  const { message } = App.useApp();
  const set = useMarketingUi((st) => st.set);
  const create = useAction<{ campaign_id: string }>('campaign.create');
  const submit = useAction('campaign.submit');
  const [d, setD] = useState<WizardDraft>(() => ({
    step: 1,
    channel: (s?.channels[0] ?? (str(prefill.channel) || 'zalo')) as MkChannel,
    q: '',
    group: 'all',
    picked: [],
    uploaded: false,
    name: s?.name ?? str(prefill.name),
    subject: s?.subject ?? str(prefill.subject),
    body: s?.body ?? (str(prefill.text) || (t.raw('defaultBody') as string)),
    send: 'now',
    at: '',
  }));
  const patch = (p: Partial<WizardDraft>) => setD((x) => ({ ...x, ...p }));
  const segs = s?.segs ?? [];
  const audience = useMemo(() => (s ? s.count : 0) + d.picked.length + (d.uploaded ? UPLOAD_VALID : 0), [s, d.picked.length, d.uploaded]);
  const visible = meta.customers
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => (d.group === 'all' || c[3] === d.group) && (!d.q || [c[0], c[1], c[2]].some((v) => v.toLowerCase().includes(d.q.toLowerCase()))));
  const toggle = (i: number) => patch({ picked: d.picked.includes(i) ? d.picked.filter((x) => x !== i) : [...d.picked, i] });
  const selectAll = () => {
    const ids = visible.map((v) => v.i);
    const all = ids.every((i) => d.picked.includes(i));
    patch({ picked: all ? d.picked.filter((i) => !ids.includes(i)) : [...new Set([...d.picked, ...ids])] });
  };
  const close = () => set({ wizard: false, fromSuggestion: null, prefill: null });

  const save = async (andSubmit: boolean) => {
    if (!d.name.trim()) return void message.error(t('errName'));
    if (!segs.length && !d.picked.length && !d.uploaded) return void message.error(t('errAud'));
    if (!d.body.trim()) return void message.error(t('errBody'));
    const r = await create.run({
      name: d.name.trim(),
      kind: (s?.kind as 'reactivation') ?? 'manual',
      channel: d.channel,
      segment_ids: segs.length ? segs : undefined,
      contact_ids: d.picked.length ? d.picked.map(contactId) : d.uploaded && !segs.length ? [IMPORT_ID] : undefined,
      content: { text: d.body.trim(), ...(d.channel === 'email' && d.subject.trim() ? { subject: d.subject.trim() } : {}), ...(s?.cta ? { cta: s.cta } : {}) },
      send: d.send,
      ...(d.send === 'schedule' && d.at ? { scheduled_at: d.at } : {}),
      ...(s ? { suggestion_id: s.id } : {}),
    });
    if (!r) return;
    if (andSubmit) await submit.run({ campaign_id: r.result.campaign_id }, { silent: true });
    close();
  };
  return { d, patch, audience, visible, toggle, selectAll, close, save, pending: create.isPending || submit.isPending };
}
