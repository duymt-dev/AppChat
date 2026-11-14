// TIP-003e §4: dòng Audit log của hành động đã gửi có đính chính → nhãn "Đã đính chính (n)", title liệt kê ghi chú; dòng không có thì không hiện.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { AuditRowDto } from '@appchat/shared';
import settings from '../../../../../messages/vi/settings.json';
import actions from '../../../../../messages/vi/actions.json';
import common from '../../../../../messages/vi/common.json';
import { AuditTable } from './AuditTable';

afterEach(cleanup);

const row = (o: Partial<AuditRowDto>): AuditRowDto => ({
  id: 'a1', time: '2026-11-14T03:00:00.000Z', name: 'Trâm', role: 'owner', actor_id: 'u1', action_id: 'quote.send', action: 'quote.send', source: 'ui', status: 'ok', ip: null, trace_id: null, ...o,
});

describe('AuditTable — đính chính', () => {
  it('có đính chính → nhãn + ghi chú ở title; không có → không nhãn', () => {
    render(
      <NextIntlClientProvider locale="vi" timeZone="Asia/Ho_Chi_Minh" messages={{ settings, actions, common }}>
        <AuditTable rows={[row({ corrections: [{ note: 'Giá đúng là 1.400.000đ', at: '2026-11-14T04:00:00.000Z' }, { note: 'Đã gọi khách', at: '2026-11-14T05:00:00.000Z' }] }), row({ id: 'a2' })]} />
      </NextIntlClientProvider>,
    );
    const tags = screen.getAllByTestId('audit-correction');
    expect(tags).toHaveLength(1);
    expect(tags[0]!.textContent).toBe('Đã đính chính (2)');
    expect(tags[0]!.getAttribute('title')).toMatch(/Giá đúng là 1\.400\.000đ\n.*Đã gọi khách$/);
  });
});
