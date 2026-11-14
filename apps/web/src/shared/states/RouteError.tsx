// Thân chung của `error.tsx` theo nhóm route (TIP-001b §2.1): PageStates trạng thái lỗi + nút Thử lại (`retry()` của Next — nạp lại
// segment), ghi log qua `logClientError`. Không hiện message / stack / digest cho người dùng.
'use client';
import { useEffect } from 'react';
import { logClientError } from '../dev/client-log';
import { PageStates } from './PageStates';

export interface RouteErrorProps {
  scope: string;
  error: unknown;
  retry: () => void;
}

export function RouteError({ scope, error, retry }: RouteErrorProps) {
  useEffect(() => {
    logClientError(scope, error);
  }, [scope, error]);
  return (
    <div data-testid="route-error" data-scope={scope}>
      <PageStates state="error" onRetry={retry}>
        {null}
      </PageStates>
    </div>
  );
}
