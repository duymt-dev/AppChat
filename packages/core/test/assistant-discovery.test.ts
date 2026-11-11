// TIP-023e §1.1-§1.2: buildCorpus — chỉ action implemented, sắp theo id, document/schema hash tách biệt, corpus_hash đổi khi registry
// hiện hành đổi (qua implemented predicate ở đây — đại diện cho "đăng ký thêm action mới" trong kịch bản thật).
import { describe, expect, it } from 'vitest';
import { registry } from '@appchat/actions';
import { buildCorpus } from '../src/ai/assistant/discovery/corpus';

const TWO = registry.slice(0, 2).map((a) => a.id);
const implementedOf = (ids: readonly string[]) => (id: string) => ids.includes(id);

describe('buildCorpus (TIP-023e §1.1-§1.2)', () => {
  it('chỉ action implemented; sắp theo action ID (không theo thứ tự registry)', () => {
    const unsorted = [...TWO].reverse();
    const c = buildCorpus(implementedOf(unsorted));
    expect(c.docs.map((d) => d.actionId)).toEqual([...unsorted].sort());
  });

  it('document hash / schema hash khác nhau cho action khác nhau; deterministic (build lại → cùng hash)', () => {
    const c1 = buildCorpus(implementedOf(TWO));
    const c2 = buildCorpus(implementedOf(TWO));
    expect(c1.corpusHash).toBe(c2.corpusHash);
    expect(c1.docs[0]!.documentHash).not.toBe(c1.docs[1]!.documentHash);
    expect(c1.docs[0]!.schemaHash).not.toBe(c1.docs[1]!.schemaHash);
    expect(c1.docs.every((d) => /^[0-9a-f]{64}$/.test(d.documentHash) && /^[0-9a-f]{64}$/.test(d.schemaHash))).toBe(true);
  });

  it('corpus_hash đổi khi tập action implemented đổi (đại diện: thêm/bớt action)', () => {
    const base = buildCorpus(implementedOf(TWO));
    const plusOne = buildCorpus(implementedOf([...TWO, registry[2]!.id]));
    const fewer = buildCorpus(implementedOf([TWO[0]!]));
    expect(plusOne.corpusHash).not.toBe(base.corpusHash);
    expect(fewer.corpusHash).not.toBe(base.corpusHash);
  });

  it('không action nào implemented → corpus rỗng, không ném lỗi', () => {
    const c = buildCorpus(() => false);
    expect(c.docs).toEqual([]);
    expect(c.corpusHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('văn bản document không chứa dữ liệu lúc chạy — chỉ id/mô tả/nhãn/module/risk tĩnh của registry', () => {
    const c = buildCorpus(implementedOf(TWO));
    for (const d of c.docs) {
      expect(d.text.length).toBeGreaterThan(0);
      expect(d.text.length).toBeLessThanOrEqual(2000);
      expect(d.text).not.toMatch(/\$ref|session_id|run_id|confirm_token/);
    }
  });
});
