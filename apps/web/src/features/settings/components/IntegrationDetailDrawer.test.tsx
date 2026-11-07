// TIP-012b P3 §5.2 (AC7): drawer chi tiết kết nối — sức khoẻ từ bằng chứng (đã cấu hình ≠ đã xác minh), SePay chỉ webhook (không nút
// đồng bộ), Casso có kéo: "Đồng bộ ngay" → biên nhận accepted hiện "đang đồng bộ" (không báo xong khi mới nhận việc), nhật ký có lượt
// kéo. Không hiện bí mật.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('next-intl', () => ({
  useTranslations: (ns: string) => (k: string, v?: Record<string, unknown>) => `${ns}.${k}${v ? JSON.stringify(v) : ''}`,
  useLocale: () => 'vi',
  useTimeZone: () => 'Asia/Ho_Chi_Minh',
}));
vi.mock('@/shared/authz/useCan', () => ({ useCan: () => true }));
const err = vi.fn();
vi.mock('antd', async (orig) => ({ ...(await orig<typeof import('antd')>()), App: { useApp: () => ({ message: { success: vi.fn(), info: vi.fn(), open: vi.fn(), error: err }, modal: { confirm: vi.fn() } }) } }));

import { transport } from '@/shared/api/client';
import { MOCK_CONN } from '@/shared/api/mock/domains/integration-runtime';
import { IntegrationDetailDrawer } from './IntegrationDetailDrawer';

window.matchMedia ??= ((q: string) => ({ matches: false, media: q, onchange: null, addListener: () => undefined, removeListener: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false })) as never;

const wrap = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

afterEach(cleanup);

describe('IntegrationDetailDrawer', () => {
  it('SePay (chỉ webhook): đã cấu hình chưa xác minh, không nút đồng bộ, ghi rõ chỉ nhận webhook', async () => {
    wrap(<IntegrationDetailDrawer connectionId={MOCK_CONN.sepay!} onClose={() => undefined} onManage={() => undefined} />);
    await waitFor(() => expect(screen.getByTestId('st-int-health').getAttribute('data-health')).toBe('configured_unverified'));
    expect(screen.queryByTestId('st-int-sync')).toBeNull();
    expect(screen.getByText('settings.integrations.detail.webhookOnly')).toBeTruthy();
    expect(screen.getByTestId('st-int-evidence').textContent).toContain('••3456');
  });

  it('Casso (có kéo): Đồng bộ ngay → đang đồng bộ (accepted ≠ xong), nhật ký có lượt kéo', async () => {
    await transport.action('integration.connect', { provider: 'casso', fields: { webhook_secret: 'w', account_number: '8007041027107', api_key: 'k' } });
    wrap(<IntegrationDetailDrawer connectionId={MOCK_CONN.casso!} onClose={() => undefined} onManage={() => undefined} />);
    await waitFor(() => expect(screen.getByTestId('st-int-health').getAttribute('data-health')).toBe('verified'));
    fireEvent.click(screen.getByTestId('st-int-sync'));
    await waitFor(() => expect(err.mock.calls).toEqual([]));
    await waitFor(() => expect(screen.getByTestId('st-int-pending')).toBeTruthy());
    expect(screen.getByTestId('st-int-sync').textContent).toBe('settings.integrations.detail.syncing');
    await waitFor(() => expect(screen.getAllByTestId('st-int-call').some((c) => c.textContent?.includes('op.bank__pull'))).toBe(true));
  });

  it('P5: kết nối ngân hàng chưa bật đối soát tiền → "Bật đối soát tiền" (bank_feed.connect theo connection_id) → đang bật, nút ẩn', async () => {
    const run = vi.spyOn(transport, 'action');
    wrap(<IntegrationDetailDrawer connectionId={MOCK_CONN.sepay!} onClose={() => undefined} onManage={() => undefined} />);
    fireEvent.click(await screen.findByTestId('st-int-bind'));
    await waitFor(() => expect(run).toHaveBeenCalledWith('bank_feed.connect', expect.objectContaining({ provider: 'sepay', connection_id: MOCK_CONN.sepay, if_version: 1 }), expect.anything()));
    expect(JSON.stringify(run.mock.calls.at(-1))).not.toContain('fields');
    await waitFor(() => expect(screen.queryByTestId('st-int-bind')).toBeNull());
    expect(screen.getByTestId('st-int-evidence').textContent).toContain('settings.integrations.detail.bindingOn');
    run.mockRestore();
  });

  it('không mở khi chưa chọn kết nối', () => {
    wrap(<IntegrationDetailDrawer connectionId={null} onClose={() => undefined} onManage={() => undefined} />);
    expect(screen.queryByTestId('st-int-drawer')).toBeNull();
  });
});
