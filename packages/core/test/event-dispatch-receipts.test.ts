// TIP-003b §4.4 / §5.2: registry đóng băng một lần (đăng ký sau đó / topic chưa khai / trùng tên → lỗi), digest tất định theo nội dung
// (không theo thứ tự đăng ký); digest input của cổng action tất định theo khoá (không theo thứ tự trường).
import { afterEach, describe, expect, it } from 'vitest';
import { freezeEventRegistry, inputDigest, registerEventContract, registryDigest, resetEventRegistryForTest, type EventContract } from '../src/kernel';

const proj = (name: string, topics: string[], v = 1): EventContract => ({ name, mode: 'projection', contractVersion: v, topics, apply: async () => ({ kind: 'applied' }) });

afterEach(() => resetEventRegistryForTest());

describe('registry hợp đồng v2', () => {
  it('đóng băng: topic không consumer có dòng rỗng tường minh; đăng ký sau đóng băng → lỗi', () => {
    registerEventContract(proj('b.realtime', ['tag.created']));
    registerEventContract(proj('a.notify', ['tag.created', 'order.created']));
    const f = freezeEventRegistry(['tag.created', 'order.created', 'workspace.ready']);
    expect(f.table['workspace.ready']).toEqual([]);
    expect(f.table['tag.created']!.map((r) => r.consumer)).toEqual(['a.notify', 'b.realtime']);
    expect(() => registerEventContract(proj('c.late', ['tag.created']))).toThrow(/đóng băng/);
  });

  it('topic chưa khai / trùng tên / topic ngoài manifest → lỗi', () => {
    expect(() => registerEventContract(proj('x', ['nope.happened']))).toThrow(/chưa khai/);
    registerEventContract(proj('x', ['tag.created']));
    expect(() => registerEventContract(proj('x', ['tag.created']))).toThrow(/Trùng/);
    expect(() => freezeEventRegistry(['order.created'])).toThrow(/không nằm trong/);
  });

  it('digest tất định theo nội dung; đổi version hợp đồng → digest khác', () => {
    const t1 = { 'tag.created': [{ consumer: 'a', mode: 'projection' as const, contract_version: 1 }, { consumer: 'b', mode: 'action' as const, contract_version: 1 }] };
    const t2 = { 'tag.created': [...t1['tag.created']].reverse() };
    expect(registryDigest(t1)).toBe(registryDigest(t2));
    expect(registryDigest({ 'tag.created': [{ consumer: 'a', mode: 'projection', contract_version: 2 }] })).not.toBe(registryDigest({ 'tag.created': [{ consumer: 'a', mode: 'projection', contract_version: 1 }] }));
  });
});

describe('cổng action', () => {
  it('digest input tất định theo khoá, khác khi giá trị khác', () => {
    expect(inputDigest({ b: 1, a: { y: [1, 2], x: null } })).toBe(inputDigest({ a: { x: null, y: [1, 2] }, b: 1 }));
    expect(inputDigest({ a: 1 })).not.toBe(inputDigest({ a: 2 }));
  });
});
