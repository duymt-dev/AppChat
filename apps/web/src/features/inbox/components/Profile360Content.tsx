// Nội dung 5 tab của Hồ sơ 360° (prototype L2025–2224) — dùng chung cho panel hộp thư và drawer Khách hàng (qua index.ts).
// Hàng 6 nút thao tác (REQ-F11) tách riêng ở Profile360Actions.tsx. Tab theo bố cục vai trò (useProfileTabs): tab mặc định có
// nội dung gốc + khối thêm (nếu có), tab tuỳ biến chỉ gồm các khối.
'use client';
import { useQuery } from '@tanstack/react-query';
import { contactQuery } from '../api';
import { Overview360 } from './Overview360';
import { Ai360, Crm360, Files360, History360 } from './Tabs360';
import { Blocks360 } from './Blocks360';
import { useProfileTabs } from '../hooks/useProfileTabs';
import type { Tab360 } from '../inbox-store';

export const TABS_360: Tab360[] = ['overview', 'crm', 'ai', 'files', 'history'];

export function Profile360Content({ contactId, tab }: { contactId: string; tab: Tab360 }) {
  const c = useQuery(contactQuery(contactId)).data;
  const tabs = useProfileTabs(contactId);
  if (!c) return null;
  const cur = tabs.find((x) => x.key === tab) ?? tabs[0]!;
  if (!cur.builtin || !TABS_360.includes(cur.key)) return <Blocks360 c={c} blocks={cur.blocks} />;
  return (
    <>
      {cur.key === 'overview' ? <Overview360 c={c} packages={!cur.blocks.includes('packages')} /> : null}
      {cur.key === 'crm' ? <Crm360 c={c} /> : null}
      {cur.key === 'ai' ? <Ai360 c={c} /> : null}
      {cur.key === 'files' ? <Files360 c={c} /> : null}
      {cur.key === 'history' ? <History360 c={c} /> : null}
      {cur.blocks.length ? <Blocks360 c={c} blocks={cur.blocks} /> : null}
    </>
  );
}
