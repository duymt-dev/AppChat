// TIP-014b AC7 — trạng thái thao tác kênh trên tin: không có lệnh mở → không hiện gì; đang chờ / chưa rõ / lỗi / một phần hiện đúng dòng
// (role=status) với tông tương ứng; thu hồi và cảm xúc hiện riêng. Không có chữ "đã thu hồi" khi nhà cung cấp chưa xác nhận.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (k: string) => `${ns}.${k}` }));

import { MessageProviderStatus } from './MessageProviderStatus';

describe('MessageProviderStatus', () => {
  afterEach(cleanup);

  it('không có lệnh mở → rỗng', () => {
    const { container } = render(<MessageProviderStatus op={undefined} />);
    expect(container.textContent).toBe('');
    render(<MessageProviderStatus op={{}} />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('thu hồi đang chờ / chưa rõ / một phần / lỗi → đúng khoá i18n, không báo đã thu hồi', () => {
    for (const s of ['pending', 'unknown', 'partial', 'failed'] as const) {
      render(<MessageProviderStatus op={{ recall: s }} />);
      expect(screen.getByTestId('provider-op-recall').textContent).toBe(`inbox.providerOp.recall.${s}`);
      expect(screen.queryByText(/recalled/)).toBeNull();
      cleanup();
    }
  });

  it('thu hồi và cảm xúc cùng lúc → hai dòng riêng', () => {
    render(<MessageProviderStatus op={{ recall: 'pending', react: 'unknown' }} />);
    expect(screen.getAllByRole('status').map((e) => e.getAttribute('data-testid'))).toEqual(['provider-op-recall', 'provider-op-react']);
    expect(screen.getByTestId('provider-op-react').textContent).toBe('inbox.providerOp.react.unknown');
  });
});
