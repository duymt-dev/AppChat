// TIP-023d pha 6 (unit): nhãn chung từ registry (không chép chữ riêng), tên cấu trúc ≤ 3 bước, điểm gợi ý tất định (action ×3, module ×1,
// token tiêu đề ×1 — không dấu), bước giao việc / phân tích dùng nhãn loại bước.
import { describe, expect, it } from 'vitest';
import { scoreOf } from '../src/ai/assistant/plans/recommendations';
import { genericLabel, genericTitle, type ReuseStep } from '../src/ai/assistant/plans/reuse';

const s = (kind: ReuseStep['kind'], target: string | null = null): ReuseStep => ({ kind, target, deps: [] });

describe('genericLabel / genericTitle', () => {
  it('bước hành động → "động từ + đối tượng" theo registry; giao việc / phân tích → nhãn loại bước', () => {
    expect(genericLabel(s('action', 'contact.create'), 'vi')).toBe('Tạo khách hàng');
    expect(genericLabel(s('delegate'), 'vi')).toBe('Giao việc cho agent');
    expect(genericLabel(s('analysis'), 'en')).toBe('Analysis');
    expect(genericLabel(s('action', 'nope.nope'), 'vi')).toBe('Phân tích');
  });
  it('tên cấu trúc nối tối đa 3 nhãn', () => {
    expect(genericTitle([s('action', 'contact.create'), s('analysis'), s('delegate'), s('analysis')], 'vi')).toBe('Tạo khách hàng → Phân tích → Giao việc cho agent');
  });
});

describe('scoreOf', () => {
  const st = [s('action', 'contact.create'), s('analysis')];
  it('action trùng ×3 + module ×1; token tiêu đề không dấu ×1; không trùng → 0', () => {
    expect(scoreOf(st, 'Tạo khách hàng', { actions: ['contact.create'] })).toBe(4);
    expect(scoreOf(st, 'Tạo khách hàng', { text: 'tao khach moi' })).toBe(2);
    expect(scoreOf(st, 'Tạo khách hàng', { actions: ['ticket.create'] })).toBe(0);
  });
});
