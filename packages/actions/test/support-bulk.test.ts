// TIP-034c §1.1 / §2.1 / §3.1: hợp đồng sửa ticket hàng loạt — cha công khai bulk (luôn xem trước), không cấp agent, bắt buộc
// Idempotency-Key (cùng helper web / server); con riêng internal không bao giờ cấp agent; input cha giữ 200 id + patch kết hợp + if_versions.
import { describe, expect, it } from 'vitest';
import { getAction, isAgentGrantable, isInternalAction, registry, requiresIdempotencyKey, ticketBulkItem, ticketBulkItemUndo, ticketBulkUndo, ticketBulkUpdate } from '../src';

const A = '0190f3a2-7b1c-7d10-9a5e-4c2b1f0e9a11';

describe('support-bulk actions', () => {
  it('đăng ký đúng một lần; cha bulk / không cấp agent; con internal', () => {
    for (const id of ['ticket.bulk_update', 'ticket.bulk_undo', 'ticket.bulk_item', 'ticket.bulk_item_undo']) expect(registry.filter((a) => a.id === id)).toHaveLength(1);
    expect(getAction('ticket.bulk_update')).toBe(ticketBulkUpdate);
    expect(ticketBulkUpdate).toMatchObject({ permission: 'ticket.manage', risk: 'write', bulk: true, agentGrantable: false, undo: { windowSec: 86_400 } });
    expect(ticketBulkUndo).toMatchObject({ permission: 'ticket.manage', risk: 'write', bulk: true, agentGrantable: false });
    expect(ticketBulkUndo.undo).toBeUndefined();
    for (const d of [ticketBulkItem, ticketBulkItemUndo]) {
      expect(isInternalAction(d)).toBe(true);
      expect(isAgentGrantable(d)).toBe(false);
      expect(d.undo).toBeUndefined();
    }
  });

  it('Idempotency-Key bắt buộc cho cha (helper dùng chung web / server)', () => {
    expect(requiresIdempotencyKey('ticket.bulk_update', 'write')).toBe(true);
    expect(requiresIdempotencyKey('ticket.bulk_undo', 'write')).toBe(true);
    expect(requiresIdempotencyKey('ticket.assign', 'write')).toBe(false);
  });

  it('input cha: 1–200 id, patch kết hợp, if_versions tuỳ chọn; con: đúng 4 trường, không thêm', () => {
    const ok = ticketBulkUpdate.input.safeParse({ ticket_ids: [A], assignee_agent_id: A, priority: 'low', if_versions: { [A]: 3 } });
    expect(ok.success).toBe(true);
    expect(ticketBulkUpdate.input.safeParse({ ticket_ids: [A] }).success).toBe(true); // rỗng → 422 ở handler (trước hiệu ứng)
    expect(ticketBulkUpdate.input.safeParse({ ticket_ids: [] }).success).toBe(false);
    expect(ticketBulkUpdate.input.safeParse({ ticket_ids: Array(201).fill(A), priority: 'low' }).success).toBe(false);
    expect(ticketBulkUpdate.input.safeParse({ ticket_ids: [A], priority: 'low', if_versions: { [A]: 0 } }).success).toBe(false);
    expect(ticketBulkItem.input.safeParse({ job_id: A, seq: 0, ticket_id: A, fence: 1 }).success).toBe(true);
    expect(ticketBulkItem.input.safeParse({ job_id: A, seq: 0, ticket_id: A, fence: 1, patch: { priority: 'high' } }).success).toBe(false);
  });

  it('output cha giữ `updated` + thêm changed_count / outcomes / operation', () => {
    const r = ticketBulkUpdate.output.safeParse({
      updated: 1, changed_count: 0, failed: 1, duplicates: 0,
      outcomes: [{ id: A, ok: true, changed: false }, { id: 'x', ok: false, error: { code: 'NOT_FOUND' } }],
      operation: { job_id: A, status: 'completed', total: 1, pending: 0 },
    });
    expect(r.success).toBe(true);
  });
});
