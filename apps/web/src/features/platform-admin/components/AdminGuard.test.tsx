// TIP-040 pha 5 (AC09): AdminGuard — /admin/session 200 → hiện màn; 403 (Owner workspace không phải admin nền tảng) → "không có quyền";
// 401 → chuyển đăng nhập kèm next=/admin.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiRequestError } from '@appchat/shared';

const get = vi.fn();
const replace = vi.fn();
vi.mock('@/shared/api/client', () => ({ transport: { get: (...a: unknown[]) => get(...a) } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));

import { AdminGuard } from './AdminGuard';

const wrap = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

beforeEach(() => {
  get.mockReset();
  replace.mockReset();
});
afterEach(cleanup);

describe('AdminGuard', () => {
  it('admin nền tảng → hiện nội dung', async () => {
    get.mockResolvedValue({ user_id: 'u', name: 'A', email: 'a@x', locale: 'vi', platform_admin: true });
    render(<AdminGuard>secret-panel</AdminGuard>, { wrapper: wrap });
    expect(await screen.findByText('secret-panel')).toBeTruthy();
    expect(get).toHaveBeenCalledWith('/admin/session');
  });

  it('403 → không có quyền, không hiện nội dung', async () => {
    get.mockRejectedValue(new ApiRequestError(403, { code: 'FORBIDDEN', message: 'x' }));
    render(<AdminGuard>secret-panel</AdminGuard>, { wrapper: wrap });
    expect(await screen.findByText('denied')).toBeTruthy();
    expect(screen.queryByText('secret-panel')).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it('401 → đăng nhập kèm next=/admin', async () => {
    get.mockRejectedValue(new ApiRequestError(401, { code: 'UNAUTHENTICATED', message: 'x' }));
    render(<AdminGuard>secret-panel</AdminGuard>, { wrapper: wrap });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?next=%2Fadmin'));
    expect(screen.queryByText('secret-panel')).toBeNull();
  });
});
