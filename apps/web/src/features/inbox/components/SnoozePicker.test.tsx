// TIP-014c AC4: Tạm ẩn hội thoại — "Sáng mai" 21:00 → 08:00 ngày làm việc kế theo múi giờ workspace; +1h / +3h; "Tuỳ chọn ngày giờ".
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import inboxMessages from '../../../../messages/vi/inbox.json';
import { SnoozePicker } from './SnoozePicker';

const wrap = (nowIso: string, onPick = vi.fn(), timeZone = 'Asia/Ho_Chi_Minh') => {
  const fixed = new Date(nowIso);
  render(
    <NextIntlClientProvider locale="vi" timeZone={timeZone} messages={{ inbox: inboxMessages }}>
      <SnoozePicker timeZone={timeZone} now={() => fixed} onPick={onPick} />
    </NextIntlClientProvider>,
  );
  return onPick;
};

describe('SnoozePicker (TIP-014c AC4)', () => {
  afterEach(cleanup);

  it('"Sáng mai" lúc 21:00 Asia/Ho_Chi_Minh → 08:00 ngày làm việc kế (bỏ qua Chủ nhật)', () => {
    // Thứ Tư 2026-11-11 21:00+07:00 = 2026-11-11T14:00:00Z → Thứ Năm 08:00+07:00 = 2026-11-12T01:00:00Z
    const onPick = wrap('2026-11-11T14:00:00.000Z');
    fireEvent.click(screen.getByTestId('snooze-opt-tomorrow'));
    expect(onPick).toHaveBeenCalledWith('2026-11-12T01:00:00.000Z');

    cleanup();
    // Thứ Bảy 2026-11-14 21:00+07:00 → bỏ qua Chủ nhật → Thứ Hai 2026-11-16 08:00+07:00
    const onPickWknd = wrap('2026-11-14T14:00:00.000Z');
    fireEvent.click(screen.getByTestId('snooze-opt-tomorrow'));
    expect(onPickWknd).toHaveBeenCalledWith('2026-11-16T01:00:00.000Z');
  });

  it('+1h và +3h tính đúng mốc tương đối UTC', () => {
    const onPick1 = wrap('2026-11-11T14:00:00.000Z');
    fireEvent.click(screen.getByTestId('snooze-opt-1h'));
    expect(onPick1).toHaveBeenCalledWith('2026-11-11T15:00:00.000Z');

    cleanup();
    const onPick3 = wrap('2026-11-11T14:00:00.000Z');
    fireEvent.click(screen.getByTestId('snooze-opt-3h'));
    expect(onPick3).toHaveBeenCalledWith('2026-11-11T17:00:00.000Z');
  });

  it('"Tuỳ chọn ngày giờ": chặn mốc quá khứ, nhận mốc tương lai đúng múi giờ', () => {
    const onPick = wrap('2026-11-11T14:00:00.000Z'); // 21:00+07:00
    fireEvent.click(screen.getByTestId('snooze-opt-custom'));

    fireEvent.change(screen.getByTestId('snooze-custom-date'), { target: { value: '2026-11-11' } });
    fireEvent.change(screen.getByTestId('snooze-custom-time'), { target: { value: '20:00' } });
    fireEvent.click(screen.getByTestId('snooze-custom-apply'));
    expect(screen.getByTestId('snooze-custom-error').textContent).toContain('tương lai');
    expect(onPick).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId('snooze-custom-date'), { target: { value: '2026-11-12' } });
    fireEvent.change(screen.getByTestId('snooze-custom-time'), { target: { value: '09:30' } });
    fireEvent.click(screen.getByTestId('snooze-custom-apply'));
    expect(screen.queryByTestId('snooze-custom-error')).toBeNull();
    expect(onPick).toHaveBeenCalledWith('2026-11-12T02:30:00.000Z');
  });
});
