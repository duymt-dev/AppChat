// Giá trị kiểu prototype "6.8tr" (KPI doanh thu lịch hẹn).
'use client';
import { useTranslations } from 'next-intl';
import { useFmt } from '@/shared/i18n/useFmt';

export function useTr() {
  const t = useTranslations('calendar');
  const fmt = useFmt();
  return (v: string) => t('tr', { n: fmt.number(Math.round(Number(v) / 100_000) / 10) });
}
