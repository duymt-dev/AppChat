// Nhãn SLA: "Còn 45m" · "Quá hạn 2h 30m" · "Đã đóng" · "Tạm dừng" (prototype slaTime L8690) + đồng hồ đếm ngược trong drawer (tkdCountdown L9165).
'use client';
import { useTranslations } from 'next-intl';
import { color } from '@appchat/ui';
import { SLA_TONE } from '../status';
import type { Ticket } from '../types';

export function useDur() {
  const t = useTranslations('tickets.dur');
  return (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h && m ? t('hm', { h, m }) : h ? t('h', { h }) : t('m', { m });
  };
}

export function useSlaLabel() {
  const t = useTranslations('tickets');
  const dur = useDur();
  return (k: Ticket) => {
    if (k.status === 'closed') return t('slaClosed');
    const left = k.sla.left_min ?? 0;
    return left < 0 ? t('slaOver', { t: dur(-left) }) : t('slaLeft', { t: dur(left) });
  };
}

/** Phần đã trôi của hạn TTR (0–100) + màu: ≤ 60 phút còn lại → đỏ. */
export function slaProgress(k: Ticket) {
  const left = k.sla.left_min ?? 0;
  const pct = Math.max(4, Math.min(100, Math.round((1 - left / k.ttr_target_min) * 100)));
  const urgent = k.status !== 'closed' && left <= 60;
  return { pct, tone: urgent ? color.dangerStrong : SLA_TONE[k.sla.state], urgent };
}
