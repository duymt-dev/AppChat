import { describe, expect, it } from 'vitest';
import { fieldsForRole, matchCustomFilter, mergeCustomValues, validateCustomValues, type CustomFieldDef } from './values';

const VIS = { list: true, kanban: false, form: true, filter: true, detail: true, export: true };
const def = (key: string, type: string, extra: Partial<CustomFieldDef> = {}): CustomFieldDef => ({
  key, label: key, type, options: '', required: false, ai: false, sys: false, visible_in: VIS, roles: [], condition: '', ...extra,
});
const DEFS = [
  def('full_name', 'text', { sys: true, required: true }),
  def('size', 'picklist', { options: 'S/M/L', required: true }),
  def('ltv', 'currency', { roles: ['owner', 'manager'] }),
  def('visits', 'number'),
  def('birthday', 'date'),
  def('gifts', 'multi', { options: 'Voucher / Gift box' }),
  def('mail', 'email'),
];

describe('validateCustomValues', () => {
  it('hợp lệ khi đúng kiểu, đúng lựa chọn, đủ bắt buộc', () => {
    expect(validateCustomValues(DEFS, { size: 'M', ltv: '1500000', visits: 3, birthday: '2026-01-31', gifts: ['Voucher'], mail: 'a@b.vn' }, 'owner', 'create')).toEqual({});
  });
  it('create thiếu trường bắt buộc → required', () => {
    expect(validateCustomValues(DEFS, {}, 'owner', 'create')).toEqual({ 'custom.size': 'required' });
  });
  it('update chỉ kiểm key được gửi', () => {
    expect(validateCustomValues(DEFS, { visits: 2 }, 'owner', 'update')).toEqual({});
  });
  it('sai kiểu / ngoài lựa chọn', () => {
    expect(validateCustomValues(DEFS, { size: 'XXL', visits: '3' as never, birthday: '31/01/2026', gifts: ['Xe'], mail: 'x', ltv: '1.5tr' }, 'owner', 'update')).toEqual({
      'custom.size': 'option',
      'custom.visits': 'number',
      'custom.birthday': 'date',
      'custom.gifts': 'option',
      'custom.mail': 'email',
      'custom.ltv': 'money',
    });
  });
  it('trường hệ thống / không tồn tại / ngoài vai trò bị chặn', () => {
    expect(validateCustomValues(DEFS, { full_name: 'X', nope: 'y', ltv: '1' }, 'sales', 'update')).toEqual({
      'custom.full_name': 'unknown',
      'custom.nope': 'unknown',
      'custom.ltv': 'forbidden',
    });
  });
  it('null là xoá giá trị, trừ trường bắt buộc', () => {
    expect(validateCustomValues(DEFS, { visits: null, size: null }, 'owner', 'update')).toEqual({ 'custom.size': 'required' });
  });
});

describe('helpers', () => {
  it('fieldsForRole bỏ trường hệ thống và trường giới hạn vai trò', () => {
    expect(fieldsForRole(DEFS, 'sales').map((f) => f.key)).toEqual(['size', 'visits', 'birthday', 'gifts', 'mail']);
  });
  it('mergeCustomValues: null xoá key', () => {
    expect(mergeCustomValues({ size: 'S', visits: 1 }, { size: 'L', visits: null })).toEqual({ size: 'L' });
  });
  it('matchCustomFilter: lựa chọn bằng, nhiều lựa chọn chứa, chữ chứa không phân biệt hoa thường', () => {
    const v = { size: 'M', gifts: ['Voucher'], mail: 'Lan@Spa.vn' };
    expect(matchCustomFilter(DEFS, v, { size: 'M', gifts: 'Voucher', mail: 'spa' })).toBe(true);
    expect(matchCustomFilter(DEFS, v, { size: 'S' })).toBe(false);
    expect(matchCustomFilter(DEFS, {}, { size: 'M' })).toBe(false);
    expect(matchCustomFilter(DEFS, v, { size: '' })).toBe(true);
  });
});
