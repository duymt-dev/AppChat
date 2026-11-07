// Dữ liệu drawer chi tiết run (TIP-019b §5.4): chi tiết + bước (phân trang) + việc con; chỉ tải khi có run đang mở.
'use client';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { runChildrenQuery, runDetailQuery, runStepsQuery } from '../run-api';

export function useRunDetail(id: string | null) {
  const key = id ?? '';
  const detail = useQuery({ ...runDetailQuery(key), enabled: !!id });
  const steps = useInfiniteQuery({ ...runStepsQuery(key), enabled: !!id });
  const children = useQuery({ ...runChildrenQuery(key), enabled: !!id && (detail.data?.children ?? 0) > 0 });
  return {
    detail: detail.data,
    loading: detail.isLoading,
    failed: detail.isError,
    steps: steps.data?.pages.flatMap((p) => p.data) ?? [],
    moreSteps: steps.hasNextPage ? () => void steps.fetchNextPage() : null,
    children: children.data?.data ?? [],
  };
}
