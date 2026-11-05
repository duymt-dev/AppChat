// TIP-045b annex C — lọc / đếm / ghi trên trường bị ẩn: `cf.<key>` ẩn hoặc không tồn tại → 422 FIELD_FORBIDDEN TRƯỚC truy vấn (cùng mã,
// không phân biệt "ẩn" với "không có" → số đếm không thành kênh dò); ghi trường hệ thống bị ẩn (giá vốn) → 422, không ghi mù.
import { describe, expect, it } from 'vitest';
import { AppError, authzForRole } from '@appchat/shared';
import { assertQueryFields, assertWritableSystem, viewOf } from '../src/authz/fields';

const defs = { version: '2.0', defs: [{ key: 'size', roles: [], ai: false, sys: false }, { key: 'margin', roles: ['manager'], ai: false, sys: false }] };
const err = (fn: () => void): AppError | null => {
  try {
    fn();
  } catch (e) {
    return e as AppError;
  }
  return null;
};

describe('assertQueryFields', () => {
  it('sales lọc cf.margin (chỉ manager) → 422 FIELD_FORBIDDEN; cf.size được', () => {
    const v = viewOf('contact', authzForRole('sales', 's'), defs);
    expect(err(() => assertQueryFields(v, { size: 'L' }))).toBeNull();
    const e = err(() => assertQueryFields(v, { margin: '10' }))!;
    expect(e).toBeInstanceOf(AppError);
    expect(e.code).toBe('FIELD_FORBIDDEN');
    expect(e.httpStatus).toBe(422);
    expect(e.fields).toEqual({ 'cf.margin': 'forbidden' });
  });

  it('key không tồn tại cùng mã với key bị ẩn (không lộ sự tồn tại)', () => {
    const v = viewOf('contact', authzForRole('sales', 's'), defs);
    expect(err(() => assertQueryFields(v, { nope: 'x' }))!.fields).toEqual({ 'cf.nope': 'forbidden' });
  });

  it('lọc theo trường hệ thống bị ẩn (giá vốn) → 422; manager được', () => {
    expect(err(() => assertQueryFields(viewOf('product', authzForRole('sales', 's'), defs), {}, ['cost']))!.fields).toEqual({ cost: 'forbidden' });
    expect(err(() => assertQueryFields(viewOf('product', authzForRole('manager', 'm'), defs), {}, ['cost']))).toBeNull();
  });
});

describe('assertWritableSystem', () => {
  it('sales gửi cost khi tạo / sửa sản phẩm → 422; không gửi cost → được; owner được', () => {
    expect(err(() => assertWritableSystem('product', authzForRole('sales', 's'), { name: 'A', cost: '1000' }))!.code).toBe('FIELD_FORBIDDEN');
    expect(err(() => assertWritableSystem('product', authzForRole('sales', 's'), { name: 'A' }))).toBeNull();
    expect(err(() => assertWritableSystem('product', authzForRole('owner', 'o'), { cost: '1000' }))).toBeNull();
  });
});
