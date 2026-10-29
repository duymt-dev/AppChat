// 5 trạng thái bắt buộc của mọi màn (frontend-structure §9).
'use client';
import type { ReactNode } from 'react';
import { Button, Empty, Result, Skeleton } from 'antd';
import { useTranslations } from 'next-intl';

export type PageState = 'loading' | 'empty' | 'error' | 'ready' | 'no-permission';

export interface PageStatesProps {
  state: PageState;
  children: ReactNode;
  skeleton?: ReactNode;
  empty?: ReactNode;
  onRetry?: () => void;
}

export const stateOf = (q: { isPending: boolean; isError: boolean; data?: unknown }, isEmpty?: (d: never) => boolean): PageState => {
  if (q.isPending) return 'loading';
  if (q.isError) return 'error';
  if (isEmpty && q.data !== undefined && isEmpty(q.data as never)) return 'empty';
  return 'ready';
};

export function PageStates({ state, children, skeleton, empty, onRetry }: PageStatesProps) {
  const t = useTranslations('common');
  switch (state) {
    case 'loading':
      return skeleton ?? <Skeleton active />;
    case 'empty':
      return empty ?? <Empty description={t('empty')} />;
    case 'error':
      return (
        <Result
          status="error"
          title={t('error')}
          extra={onRetry ? <Button onClick={onRetry}>{t('retry')}</Button> : null}
        />
      );
    case 'no-permission':
      return <Result status="403" title={t('noPermission')} />;
    default:
      return children;
  }
}
