// State hộp "Thêm thành viên & ghi nhận điểm" (3 bước) — prototype lyAdd L11498–11570, chỉnh theo COMMERCE §7:
// điểm tự động chỉ cộng khi đơn hoàn tất, nên hộp này là điều chỉnh tay ± kèm 1 trong 7 lý do (loyalty.adjust_points).
// Khách mới: contact.create rồi adjust_points. Không có "Hạng khởi tạo" — hạng xét theo điểm tích 12 tháng.
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { AdjustReason } from '@appchat/actions';
import { useAction } from '@/shared/actions/useAction';
import { useLoyaltyUi } from '../loyalty-store';
import { loyaltyConfigQuery, lookupMember } from '../api';
import type { Lookup, TierKey } from '../types';

export type AdjustDir = 'plus' | 'minus';

export function useAdjust(initialPhone: string) {
  const t = useTranslations('loyalty.adj');
  const { message } = App.useApp();
  const set = useLoyaltyUi((s) => s.set);
  const cfg = useQuery(loyaltyConfigQuery()).data;
  const create = useAction<{ contact_id: string }>('contact.create');
  const adjust = useAction<{ balance_after: number; tier: string }>('loyalty.adjust_points');
  const [phone, setPhone] = useState(initialPhone);
  const [found, setFound] = useState<Lookup | null>(null);
  const [name, setName] = useState('');
  const [dir, setDir] = useState<AdjustDir>('plus');
  const [amount, setAmount] = useState('500');
  const [reason, setReason] = useState<AdjustReason>('compensation');
  const [note, setNote] = useState('');

  const lookup = async () => {
    if (phone.replace(/\D/g, '').length < 9) return void message.error(t('errPhone'));
    setFound(await lookupMember(phone));
  };
  const n = Math.abs(parseInt(amount.replace(/\D/g, ''), 10) || 0);
  const delta = dir === 'plus' ? n : -n;
  const m = found?.member;
  const balance = (m?.points ?? 0) + delta;
  const earned = (m?.earned ?? 0) + Math.max(0, delta);
  const tierAfter = ([...(cfg?.tiers ?? [])].reverse().find((x) => earned >= x.min)?.key ?? 'member') as TierKey;
  const step = !found ? 1 : 3;

  const save = async () => {
    if (!found) return;
    if (!n) return void message.error(t('errPoints'));
    if (reason === 'other' && !note.trim()) return void message.error(t('errNote'));
    let id = m?.contact_id ?? found.contact?.id;
    const who = m?.name ?? found.contact?.name ?? name.trim();
    if (!id) {
      if (!name.trim()) return void message.error(t('errName'));
      const r = await create.run({ full_name: name.trim(), phone });
      if (!r) return;
      id = r.result.contact_id;
    }
    const r = await adjust.run({ contact_id: id, delta, reason, ...(note.trim() ? { note: note.trim() } : {}) }, { silent: false });
    if (!r) return;
    void message.success(t('done', { d: (delta > 0 ? '+' : '') + delta.toLocaleString('vi-VN'), name: who }));
    set({ adjust: false, adjustFor: null });
  };

  return {
    phone,
    setPhone: (v: string) => (setPhone(v.replace(/[^0-9 ]/g, '')), setFound(null)),
    lookup,
    found,
    step,
    name,
    setName,
    dir,
    setDir,
    amount,
    setAmount: (v: string) => setAmount(v.replace(/\D/g, '')),
    reason,
    setReason,
    note,
    setNote,
    balance,
    current: m?.points ?? 0,
    tierAfter,
    cfg,
    save,
    pending: create.isPending || adjust.isPending,
    close: () => set({ adjust: false, adjustFor: null }),
  };
}
