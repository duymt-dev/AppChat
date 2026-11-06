// TIP-040 pha 5 (AC07 / AC09): bảng Workspace — tạm dừng cần lý do (≥ 3 ký tự) rồi gọi admin.workspace.suspend với `if_version` đang
// thấy; workspace tạm dừng có nút Mở lại; số liệu chưa làm tươi hiện "—" (không giả 0); trang sau gửi cursor.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const get = vi.fn();
const run = vi.fn();
vi.mock('@/shared/api/client', () => ({ transport: { get: (...a: unknown[]) => get(...a) } }));
vi.mock('@/shared/actions/useAction', () => ({ useAction: (id: string) => ({ run: (i: unknown) => run(id, i), isPending: false }) }));
vi.mock('@/shared/i18n/useFmt', () => ({ useFmt: () => ({ date: (d: string) => `D(${d})` }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string, p?: Record<string, unknown>) => (p ? `${k} ${JSON.stringify(p)}` : k) }));

import { WorkspaceTable } from './WorkspaceTable';
import { stubDom } from './test-dom';

stubDom();

const ws = (id: string, status: 'active' | 'suspended', version: number) => ({
  id,
  name: `WS ${id}`,
  slug: id,
  status,
  db_status: status,
  version,
  suspended_at: null,
  suspend_reason: null,
  owner: { name: 'O', email: `${id}@x.vn` },
  subscription: null,
  stats: null,
  refreshed_at: null,
  created_at: '2026-06-20T03:00:00.000Z',
});
const wrap = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

beforeEach(() => {
  get.mockReset();
  run.mockReset().mockResolvedValue({ result: {} });
});
afterEach(cleanup);

describe('WorkspaceTable', () => {
  it('tạm dừng: lý do bắt buộc, gửi đúng if_version; tạm dừng có Mở lại; stats null → —', async () => {
    get.mockResolvedValue({ data: [ws('a1', 'active', 3), ws('b2', 'suspended', 5)], next_cursor: 'C1' });
    render(<WorkspaceTable />, { wrapper: wrap });
    fireEvent.click(await screen.findByTestId('adm-ws-suspend-a1'));
    const ok = () => screen.getByTestId('adm-ws-suspend-ok').closest('button')!;
    expect(ok().disabled).toBe(true);
    fireEvent.change(screen.getByTestId('adm-ws-reason'), { target: { value: 'nợ phí' } });
    expect(ok().disabled).toBe(false);
    await act(async () => void fireEvent.click(ok()));
    expect(run).toHaveBeenCalledWith('admin.workspace.suspend', { workspace_id: 'a1', if_version: 3, reason: 'nợ phí' });
    await act(async () => void fireEvent.click(screen.getByTestId('adm-ws-resume-b2')));
    expect(run).toHaveBeenCalledWith('admin.workspace.resume', { workspace_id: 'b2', if_version: 5 });
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('trang sau gửi cursor của trang trước', async () => {
    get.mockResolvedValue({ data: [ws('a1', 'active', 0)], next_cursor: 'C1' });
    render(<WorkspaceTable />, { wrapper: wrap });
    await act(async () => void fireEvent.click(await screen.findByTestId('adm-ws-pager-next')));
    expect(get).toHaveBeenLastCalledWith('/admin/workspaces', { cursor: 'C1' });
  });
});
