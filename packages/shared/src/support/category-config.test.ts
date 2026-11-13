import { describe, expect, it } from 'vitest';
import { CATEGORY_LABELS_MAX, DEFAULT_CATEGORY_LABELS, categoryFieldErrors, categoryKey, diffCategoryLabels, isValidCategoryConfig, validateCategoryLabels } from './category-config';

describe('validateCategoryLabels', () => {
  it('NFC + trim, giữ chữ hoa / dấu; mặc định 8 nhãn prototype hợp lệ', () => {
    const v = validateCategoryLabels(['  Hoàn tiền ', 'Giao hàng'.normalize('NFD')]);
    expect(v.labels).toEqual(['Hoàn tiền', 'Giao hàng']);
    expect(isValidCategoryConfig(v)).toBe(true);
    expect(isValidCategoryConfig(validateCategoryLabels([...DEFAULT_CATEGORY_LABELS]))).toBe(true);
  });

  it('trùng không phân biệt hoa thường (lần sau bị đánh dấu); khác dấu là hai nhãn', () => {
    const v = validateCategoryLabels(['Refund', 'refund ', 'Hoàn tiền', 'Hoan tien']);
    expect(v.errors).toEqual([{ index: 1, code: 'duplicate' }]);
    expect(categoryKey('ĐỔI TRẢ')).toBe(categoryKey('đổi trả'));
  });

  it('rỗng / ký tự điều khiển / xuống dòng / > 60 code point → lỗi theo vị trí; emoji tính 1 code point', () => {
    const v = validateCategoryLabels(['', 'a\nb', 'x\u0007', 'é'.repeat(61), '😀'.repeat(60)]);
    expect(v.errors).toEqual([
      { index: 0, code: 'empty' },
      { index: 1, code: 'control' },
      { index: 2, code: 'control' },
      { index: 3, code: 'too_long' },
    ]);
    expect(categoryFieldErrors(v)).toEqual({ 'labels.0': 'empty', 'labels.1': 'control', 'labels.2': 'control', 'labels.3': 'too_long' });
  });

  it('danh sách rỗng / quá 100 → lỗi cả danh sách', () => {
    expect(validateCategoryLabels([]).list).toBe('empty');
    const many = Array.from({ length: CATEGORY_LABELS_MAX + 1 }, (_, i) => `Nhãn ${i}`);
    expect(validateCategoryLabels(many).list).toBe('too_many');
    expect(isValidCategoryConfig(validateCategoryLabels(many.slice(0, CATEGORY_LABELS_MAX)))).toBe(true);
  });
});

describe('diffCategoryLabels', () => {
  it('đổi tên = bớt + thêm; sắp xếp lại; đổi mặc định', () => {
    expect(diffCategoryLabels(['A', 'B', 'C'], ['C', 'B', 'D'])).toEqual({ added: ['D'], removed: ['A'], reordered: true, default_changed: true });
    expect(diffCategoryLabels(['A', 'B'], ['a', 'B', 'X'])).toEqual({ added: ['X'], removed: [], reordered: false, default_changed: false });
  });
});
