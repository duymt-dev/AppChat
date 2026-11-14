// Liệu trình của khách cho thẻ 360 (TIP-033b §4.4): chỉ tải khi thẻ hiển thị (`enabled`), gộp trang, phân biệt đang tải / lỗi / 404 (khách
// không còn thấy được) / rỗng thật. Không tự tính "còn đặt được" — chỉ hiển thị total / used / remaining của server.
'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ApiRequestError } from '@appchat/shared';
import { customerPackagesQuery } from '../api';

export type PackagesState = 'loading' | 'error' | 'denied' | 'empty' | 'ready';

export function useCustomerPackages(contactId: string, enabled = true) {
  const q = useInfiniteQuery({ ...customerPackagesQuery(contactId), enabled: enabled && !!contactId });
  const items = q.data?.pages.flatMap((p) => p.data) ?? [];
  const denied = q.error instanceof ApiRequestError && (q.error.status === 404 || q.error.status === 403);
  const state: PackagesState = q.isPending ? 'loading' : denied ? 'denied' : q.isError ? 'error' : items.length ? 'ready' : 'empty';
  return { state, items, more: !!q.hasNextPage, loadingMore: q.isFetchingNextPage, loadMore: () => void q.fetchNextPage(), retry: () => void q.refetch() };
}
