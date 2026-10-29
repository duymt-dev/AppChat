// Nội dung 5 tab của Hồ sơ 360° (prototype L2025–2224) — dùng chung cho panel hộp thư và drawer Khách hàng (qua index.ts).
// Hàng 6 nút thao tác (REQ-F11) tách riêng ở Profile360Actions.tsx.
'use client';
import { useQuery } from '@tanstack/react-query';
import { contactQuery } from '../api';
import { Overview360 } from './Overview360';
import { Ai360, Crm360, Files360, History360 } from './Tabs360';
import type { Tab360 } from '../inbox-store';

export const TABS_360: Tab360[] = ['overview', 'crm', 'ai', 'files', 'history'];

export function Profile360Content({ contactId, tab }: { contactId: string; tab: Tab360 }) {
  const c = useQuery(contactQuery(contactId)).data;
  if (!c) return null;
  return (
    <>
      {tab === 'overview' ? <Overview360 c={c} /> : null}
      {tab === 'crm' ? <Crm360 c={c} /> : null}
      {tab === 'ai' ? <Ai360 c={c} /> : null}
      {tab === 'files' ? <Files360 c={c} /> : null}
      {tab === 'history' ? <History360 c={c} /> : null}
    </>
  );
}
