// TIP-020e AC8: thẻ trạng thái chỉ mục embedding — chỉ mục hiện hành không hiện gì; cũ → cảnh báo + nút "Tạo lại chỉ mục"; đang chạy →
// tiến độ THẬT done / expected (thanh có aria-valuenow, không thanh giả khi expected = 0) + Huỷ (không có nút tạo lại); lỗi → lý do dịch,
// mã lạ không in thô; suy giảm (model của khe đã gỡ) → chỉ tìm từ khoá; chưa có route embed → không có nút; vi / en.
import { afterEach, describe, expect, it, vi as viFn } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { KbIndexStatus as Status } from '@appchat/shared';
import vi from '../../../../messages/vi/settings.json';
import en from '../../../../messages/en/settings.json';
import { KbIndexStatus } from './KbIndexStatus';

const base: Status = { state: 'current', phase: null, generation_id: null, active_space_label: 'openai · te3-small', done: 0, expected: 0, degraded: null, reason: null };
const STALE: Status = { ...base, state: 'stale', target_space_label: 'openai · te3-large' };
const RUN: Status = { ...STALE, phase: 'building', generation_id: '0190f000-0000-7000-8000-000000000001', done: 64, expected: 150 };

const show = (status: Status | null, locale: 'vi' | 'en' = 'vi', on = { reindex: viFn.fn(), cancel: viFn.fn() }) => {
  render(
    <NextIntlClientProvider locale={locale} messages={{ settings: locale === 'vi' ? vi : en }}>
      <KbIndexStatus status={status} busy={false} onReindex={on.reindex} onCancel={on.cancel} />
    </NextIntlClientProvider>,
  );
  return on;
};

afterEach(cleanup);

describe('KbIndexStatus', () => {
  it('chỉ mục hiện hành / chưa có dữ liệu → không hiện gì', () => {
    show(base);
    expect(screen.queryByTestId('st-rag-index')).toBeNull();
    show(null);
    expect(screen.queryByTestId('st-rag-index')).toBeNull();
  });

  it('cũ → cảnh báo nêu model cũ / mới + nút tạo lại gọi onReindex', () => {
    const on = show(STALE);
    const card = screen.getByTestId('st-rag-index');
    expect(card.getAttribute('data-state')).toBe('stale');
    expect(card.textContent).toContain('Model embedding đã đổi');
    expect(card.textContent).toContain('openai · te3-small');
    expect(card.textContent).toContain('openai · te3-large');
    fireEvent.click(screen.getByTestId('st-rag-index-reindex'));
    expect(on.reindex).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('st-rag-index-cancel')).toBeNull();
  });

  it('đang chạy → tiến độ thật 64 / 150, thanh có aria-valuenow, Huỷ gọi onCancel, không có nút tạo lại', () => {
    const on = show(RUN);
    expect(screen.getByTestId('st-rag-index-progress').textContent).toBe('64 / 150 đoạn');
    const bar = screen.getByRole('progressbar');
    expect([bar.getAttribute('aria-valuenow'), bar.getAttribute('aria-valuemax')]).toEqual(['64', '150']);
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('43%');
    expect(screen.queryByTestId('st-rag-index-reindex')).toBeNull();
    fireEvent.click(screen.getByTestId('st-rag-index-cancel'));
    expect(on.cancel).toHaveBeenCalledTimes(1);
  });

  it('expected = 0 (chưa đếm) → thanh 0%, không giả tiến độ', () => {
    show({ ...RUN, done: 0, expected: 0 });
    expect((screen.getByRole('progressbar').firstElementChild as HTMLElement).style.width).toBe('0%');
  });

  it('lỗi → lý do đã dịch + tạo lại được; mã lạ → nhãn chung, không in mã thô', () => {
    show({ ...STALE, phase: 'failed', reason: 'credit_exhausted', done: 64, expected: 150 });
    expect(screen.getByTestId('st-rag-index').textContent).toContain('Lý do: hết Credit.');
    expect(screen.getByTestId('st-rag-index-reindex')).toBeTruthy();
    cleanup();
    show({ ...STALE, phase: 'failed', reason: 'weird_internal_code' });
    const t = screen.getByTestId('st-rag-index').textContent!;
    expect(t).toContain('lỗi hệ thống');
    expect(t).not.toContain('weird_internal_code');
  });

  it('suy giảm: model của khe đã gỡ → chỉ tìm từ khoá, có nút tạo lại; chưa cấu hình route embed → không có nút', () => {
    show({ ...STALE, degraded: 'embed_space_retired' });
    expect(screen.getByTestId('st-rag-index').getAttribute('data-state')).toBe('embed_space_retired');
    expect(screen.getByTestId('st-rag-index').textContent).toContain('chỉ tìm theo từ khoá');
    expect(screen.getByTestId('st-rag-index-reindex')).toBeTruthy();
    cleanup();
    show({ ...base, degraded: 'no_model_route' });
    expect(screen.getByTestId('st-rag-index').getAttribute('data-state')).toBe('no_model_route');
    expect(screen.queryByTestId('st-rag-index-reindex')).toBeNull();
  });

  it('en: nhãn tiếng Anh', () => {
    show(RUN, 'en');
    expect(screen.getByTestId('st-rag-index').textContent).toContain('Rebuilding the index');
    expect(screen.getByTestId('st-rag-index-progress').textContent).toBe('64 / 150 chunks');
    expect(screen.getByTestId('st-rag-index-cancel').textContent).toBe('Cancel');
  });
});
