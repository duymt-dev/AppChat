// Cổng màn /admin (TIP-040): hỏi GET /admin/session — 200 mới hiện màn; 401 → đăng nhập; 403 → "không có quyền" (Owner workspace
// KHÔNG tự thành admin nền tảng). Mỗi endpoint vẫn tự kiểm lại phía server — guard chỉ là UX.
'use client';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Result, Skeleton } from 'antd';
import { useTranslations } from 'next-intl';
import { ApiRequestError } from '@appchat/shared';
import { adminSessionQuery } from '../api';

export function AdminGuard({ children }: { children: ReactNode }) {
  const t = useTranslations('platformAdmin');
  const router = useRouter();
  const q = useQuery(adminSessionQuery());
  const status = q.error instanceof ApiRequestError ? q.error.status : 0;
  useEffect(() => {
    if (status === 401) router.replace(`/login?next=${encodeURIComponent('/admin')}`);
  }, [status, router]);
  if (q.isPending) return <Skeleton active />;
  if (q.isError) {
    return <Result status={status === 403 ? '403' : 'error'} title={t(status === 403 ? 'denied' : 'loadError')} data-testid="adm-denied" />;
  }
  return <>{children}</>;
}
