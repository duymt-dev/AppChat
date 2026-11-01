// Danh sách hội thoại theo bộ lọc đang chọn (TIP-025): tab / thư mục / kênh / tài khoản / tìm kiếm (trễ 300ms) / sắp xếp → tham số
// API, phân trang cursor. Hội thoại đang mở = `selectedId` (deep link `?c=` — thông báo) hoặc hội thoại đầu danh sách; hội thoại mở
// từ link không nằm trong trang đang xem → tải riêng.
'use client';
import { useEffect, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { conversationQuery, conversationsQuery, convParams } from '../api';
import { useInboxUi } from '../inbox-store';

function useDebounced<T>(v: T, ms: number): T {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

export function useConversations() {
  const ui = useInboxUi();
  const q = useDebounced(ui.listQuery, 300);
  const params = convParams({ tab: ui.tab, channel: ui.channel, accountId: ui.account, q, sort: ui.sort });
  const list = useInfiniteQuery(conversationsQuery(params));
  const convs = list.data?.pages.flatMap((p) => p.data) ?? [];

  // Deep link `/inbox?c=<id>` → chọn hội thoại (một lần mỗi id).
  const linked = useSearchParams().get('c');
  useEffect(() => {
    if (linked) useInboxUi.setState({ selectedId: linked, tab: 'all', mobileChat: true });
  }, [linked]);

  const inList = convs.find((c) => c.id === ui.selectedId);
  const single = useQuery({ ...conversationQuery(ui.selectedId), enabled: !!ui.selectedId && !inList && list.isSuccess });
  const conv = inList ?? single.data ?? (ui.selectedId && single.isPending && list.isSuccess ? undefined : convs[0]);

  return { list, convs, conv, params };
}
