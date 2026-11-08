// TIP-019b §5.4 (AC8): drawer chi tiết run — trạng thái thật + lý do dừng, kết quả khi xong, các bước (không input / output thô);
// nhãn trạng thái tách chờ duyệt / chờ agent con / lỗi / đã dừng, không gộp "Hoàn tất".
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

vi.mock('next-intl', () => ({
  useTranslations: (ns: string) => (k: string, v?: Record<string, unknown>) => `${ns}.${k}${v ? JSON.stringify(v) : ''}`,
  useLocale: () => 'vi',
  useTimeZone: () => 'Asia/Ho_Chi_Minh',
}));

import { RunDetailDrawer } from './RunDetailDrawer';
import { RunStatusBadge } from './RunStatusBadge';

// antd Grid (EntityDrawer) cần matchMedia — jsdom không có.
window.matchMedia ??= ((q: string) => ({ matches: false, media: q, onchange: null, addListener: () => undefined, removeListener: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false })) as never;

const wrap = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

afterEach(cleanup);

describe('RunStatusBadge', () => {
  it('mỗi trạng thái thật một nhãn; lý do dừng ở tooltip', () => {
    wrap(
      <>
        <RunStatusBadge lifecycle="waiting_child" />
        <RunStatusBadge lifecycle="failed" stopReason="max_steps" />
        <RunStatusBadge lifecycle="cancelled" />
      </>,
    );
    const b = screen.getAllByTestId('run-status');
    expect(b.map((x) => x.textContent)).toEqual(['assistant.cw.run.life.waiting_child', 'assistant.cw.run.life.failed', 'assistant.cw.run.life.cancelled']);
    expect(b[1]!.getAttribute('title')).toBe('assistant.cw.run.stopReason.max_steps');
    expect(b[0]!.getAttribute('title')).toBeNull();
  });
});

describe('RunDetailDrawer', () => {
  it('run đã xong: trạng thái completed, kết quả, các bước theo thứ tự', async () => {
    wrap(<RunDetailDrawer runId="run_4" onOpen={() => undefined} onClose={() => undefined} />);
    await waitFor(() => expect(screen.getByTestId('run-result').textContent).toContain('Gửi ZNS nhắc lịch hẹn 42 khách'));
    expect(screen.getAllByTestId('run-status')[0]!.getAttribute('data-lifecycle')).toBe('completed');
    await waitFor(() => expect(screen.getAllByTestId('run-step').length).toBeGreaterThan(0));
    expect(screen.queryByTestId('run-stop-reason')).toBeNull();
  });

  it('run chờ duyệt: không có kết quả; bước cuối "cần duyệt"', async () => {
    wrap(<RunDetailDrawer runId="run_2" onOpen={() => undefined} onClose={() => undefined} />);
    await waitFor(() => expect(screen.getAllByTestId('run-status')[0]!.getAttribute('data-lifecycle')).toBe('waiting_approval'));
    expect(screen.queryByTestId('run-result')).toBeNull();
    await waitFor(() => expect(screen.getAllByTestId('run-step').at(-1)!.textContent).toContain('outcome.needs_approval'));
  });

  it('không mở khi chưa chọn run', () => {
    wrap(<RunDetailDrawer runId={null} onOpen={() => undefined} onClose={() => undefined} />);
    expect(screen.queryByTestId('run-detail')).toBeNull();
  });
});
