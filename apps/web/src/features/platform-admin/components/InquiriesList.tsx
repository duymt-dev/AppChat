// /admin › Chuyển khoản › Liên hệ bán hàng (TIP-039 → TIP-040): hàng đợi yêu cầu gói Doanh nghiệp cho đội vận hành (chỉ đọc ở 040).
'use client';
import { useQuery } from '@tanstack/react-query';
import { Table } from 'antd';
import { useTranslations } from 'next-intl';
import { useFmt } from '@/shared/i18n/useFmt';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { adminInquiriesQuery } from '../api';
import { useCursorPage } from '../hooks/useAdminQueries';
import { CursorPager } from './CursorPager';
import type { AdminInquiry } from '../types';

export function InquiriesList() {
  const t = useTranslations('platformAdmin.transfers');
  const fmt = useFmt();
  const pg = useCursorPage<{ status?: string }>({});
  const q = useQuery(adminInquiriesQuery(pg.params));
  return (
    <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
      <Table<AdminInquiry>
        rowKey="id"
        size="middle"
        pagination={false}
        dataSource={q.data?.data ?? []}
        scroll={{ x: 900 }}
        data-testid="adm-tr-inquiries"
        locale={{ emptyText: t('emptyInquiries') }}
        columns={[
          { title: t('created'), render: (_, r) => fmt.date(r.created_at) },
          { title: t('workspace'), dataIndex: 'workspace_name' },
          { title: t('contact'), render: (_, r) => `${r.name} · ${r.email} · ${r.phone}` },
          { title: t('message'), dataIndex: 'message' },
        ]}
      />
      <CursorPager page={pg.page} hasNext={!!q.data?.next_cursor} onPrev={pg.prev} onNext={() => pg.next(q.data?.next_cursor)} testId="adm-tr-inq-pager" />
    </PageStates>
  );
}
