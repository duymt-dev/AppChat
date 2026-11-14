// TIP-015d §1: ActionDef chuyển phụ trách khai nguồn bắt buộc duyệt + if_version + kết quả phân biệt; quyền giữ crm.reassign, agentGrantable.
import { describe, expect, it } from 'vitest';
import { getAction } from '../src/index';

describe('contact.transfer_owner (TIP-015d)', () => {
  const def = getAction('contact.transfer_owner')!;

  it('crm.reassign · write · agentGrantable · undo 24h · Trợ lý / agent / tác vụ luôn duyệt', () => {
    expect(def.permission).toBe('crm.reassign');
    expect(def.risk).toBe('write');
    expect(def.agentGrantable).toBe(true);
    expect(def.undo?.windowSec).toBe(86_400);
    expect([...(def.requiredApprovalSources ?? [])].sort()).toEqual(['agent', 'assistant', 'task']);
  });

  it('input nhận if_version dương; model không khai được nguồn / approval', () => {
    const base = { contact_id: 'c', to_user_id: 'u', move: { conversations: true, quotes: false, appointments: false } };
    expect(def.input.safeParse({ ...base, if_version: 3 }).success).toBe(true);
    expect(def.input.safeParse({ ...base, if_version: 0 }).success).toBe(false);
    const parsed = def.input.parse({ ...base, source: 'ui', approval_id: 'x' }) as Record<string, unknown>;
    expect(parsed.source).toBeUndefined();
    expect(parsed.approval_id).toBeUndefined();
  });

  it('output phân biệt transferred / skipped_already_owner (skip: transfer_id null, đếm 0)', () => {
    const moved = { conversations: 0, quotes: 0, appointments: 0 };
    expect(def.output.safeParse({ status: 'skipped_already_owner', owner_user_id: 'u', moved, transfer_id: null, version: 2 }).success).toBe(true);
    expect(def.output.safeParse({ status: 'skipped_already_owner', owner_user_id: 'u', moved, transfer_id: 't', version: 2 }).success).toBe(false);
    expect(def.output.safeParse({ status: 'transferred', owner_user_id: 'u', moved, transfer_id: 't', version: 3 }).success).toBe(true);
    expect(def.output.safeParse({ owner_user_id: 'u', moved }).success).toBe(false);
  });
});
