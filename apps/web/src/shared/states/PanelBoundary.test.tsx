// TIP-001b §2.2 (AC2): lỗi render trong panel chỉ thay panel bằng trạng thái lỗi + Thử lại — phần còn lại của màn vẫn hiện; Thử lại dựng
// lại cây con; log chỉ mang tên lỗi (không message / stack — message có thể chứa dữ liệu người dùng).
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import common from '../../../messages/vi/common.json';
import { describeError } from '../dev/client-log';
import { MOCK_FAULT_KEY } from '../dev/MockFault';
import { PanelBoundary } from './PanelBoundary';

window.matchMedia ??= ((q: string) => ({ matches: false, media: q, onchange: null, addListener: () => undefined, removeListener: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false })) as never;

let boom = true;
function Flaky() {
  if (boom) throw new Error('Nguyễn Văn A 0901234567');
  return <div data-testid="flaky-ok">ok</div>;
}

const wrap = (ui: ReactNode) =>
  render(
    <NextIntlClientProvider locale="vi" messages={{ common }}>
      <div data-testid="screen-rest">rest</div>
      {ui}
    </NextIntlClientProvider>,
  );

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.removeItem(MOCK_FAULT_KEY);
  boom = true;
});

describe('PanelBoundary', () => {
  it('lỗi trong panel → chỉ panel hiện lỗi + Thử lại; phần còn lại của màn vẫn hiện', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    wrap(
      <PanelBoundary name="p360">
        <Flaky />
      </PanelBoundary>,
    );
    expect(screen.getByTestId('screen-rest')).toBeTruthy();
    expect(screen.getByTestId('panel-error').getAttribute('data-panel')).toBe('p360');
    expect(screen.getByText(common.error)).toBeTruthy();
    const ours = log.mock.calls.filter((c) => c[0] === '[appchat:error]');
    expect(ours).toEqual([['[appchat:error]', { scope: 'panel:p360', name: 'Error' }]]);
    expect(JSON.stringify(ours)).not.toContain('0901234567');
  });

  it('Thử lại dựng lại panel', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    wrap(
      <PanelBoundary name="drawer">
        <Flaky />
      </PanelBoundary>,
    );
    boom = false;
    fireEvent.click(screen.getByRole('button', { name: common.retry }));
    expect(screen.queryByTestId('panel-error')).toBeNull();
    expect(screen.getByTestId('flaky-ok')).toBeTruthy();
  });

  it('không lỗi → render con, không thêm DOM', () => {
    boom = false;
    const { container } = wrap(
      <PanelBoundary name="x">
        <Flaky />
      </PanelBoundary>,
    );
    expect(container.querySelectorAll('[data-testid]').length).toBe(2);
  });

  it('lỗi giả mock (`ac_mock_fault = panel:<tên>`) ném qua boundary; tên khác không ảnh hưởng', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    boom = false;
    window.localStorage.setItem(MOCK_FAULT_KEY, 'panel:other');
    wrap(
      <PanelBoundary name="p360">
        <Flaky />
      </PanelBoundary>,
    );
    expect(screen.getByTestId('flaky-ok')).toBeTruthy();
    cleanup();
    window.localStorage.setItem(MOCK_FAULT_KEY, 'panel:p360');
    wrap(
      <PanelBoundary name="p360">
        <Flaky />
      </PanelBoundary>,
    );
    expect(screen.getByTestId('panel-error')).toBeTruthy();
  });

  it('describeError chỉ giữ tên + digest (lỗi server), không message', () => {
    const e = Object.assign(new TypeError('secret@example.com'), { digest: '12345' });
    expect(describeError('app', e)).toEqual({ scope: 'app', name: 'TypeError', digest: '12345' });
    expect(describeError('app', 'chuỗi')).toEqual({ scope: 'app', name: 'string' });
  });
});
