// TIP-023e §2.3: vectorTopK — top-N cosine CHỈ trong allowedIds đã lọc quyền trước (không top-K toàn cục rồi lọc sau); allowedIds
// rỗng → không truy vấn SQL (tránh IN () vô nghĩa).
import { describe, expect, it, vi } from 'vitest';
import { vectorTopK } from '../src/ai/assistant/discovery/vector-query';

describe('vectorTopK (TIP-023e §2.3)', () => {
  it('allowedIds rỗng → trả rỗng ngay, không gọi $queryRaw', async () => {
    const queryRaw = vi.fn();
    const db = { $queryRaw: queryRaw };
    const out = await vectorTopK(db, 'gen-1', [1, 0, 0], [], 20);
    expect(out).toEqual([]);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('có allowedIds → gọi $queryRaw một lần, trả action_id theo thứ tự hàng trả về', async () => {
    const rows = [{ action_id: 'contact.create', score: 0.9 }, { action_id: 'contact.search', score: 0.7 }];
    const queryRaw = vi.fn().mockResolvedValue(rows);
    const db = { $queryRaw: queryRaw };
    const out = await vectorTopK(db, 'gen-1', [1, 0, 0], ['contact.create', 'contact.search'], 20);
    expect(out).toEqual(['contact.create', 'contact.search']);
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });
});
