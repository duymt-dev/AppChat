// Pager đã gắn i18n (common.pager) cho màn danh sách: "Hiển thị a–b / n <đơn vị>" · ‹ Trước 1 2 3 Sau › · 20 / trang.
'use client';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Pager } from '@appchat/ui';
import type { PageMeta, PageState } from './paged';

export interface ListPagerProps {
  meta: PageMeta | undefined;
  /** Đơn vị đếm đã dịch ("báo giá", "đơn hàng"…). */
  unit: string;
  onChange: (p: PageState) => void;
  extra?: ReactNode;
  testId?: string;
}

export function ListPager({ meta, unit, onChange, extra, testId }: ListPagerProps) {
  const t = useTranslations('common.pager');
  const total = meta?.total ?? 0;
  const page = meta?.page ?? 1;
  const limit = meta?.limit ?? 20;
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = Math.min(total, page * limit);
  return (
    <Pager
      page={page}
      size={limit}
      total={total}
      onPage={(p) => onChange({ page: p, limit })}
      onSize={(n) => onChange({ page: 1, limit: n })}
      label={t.rich('range', { from, to, total, unit, b: (c) => <b>{c}</b> })}
      prev={t('prev')}
      next={t('next')}
      sizeLabel={(n) => t('perPage', { n })}
      extra={extra}
      testId={testId}
    />
  );
}
