// TIP-015d §1.2 + §2.2: luật duyệt bắt buộc theo ActionDef gộp SAU bảng policy (cấm vẫn cấm; ui / api / system không bị ép), registry port
// trung lập (trùng → lỗi boot, thiếu → 503, không giả 0).
import 'reflect-metadata';
import { afterEach, describe, expect, it } from 'vitest';
import { getAction } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import { decidePolicy } from '../src/kernel/actions/policy';
import { requiredApproval, withRequiredApproval } from '../src/kernel/actions/required-approval';
import { ownershipPort, registerOwnershipPort, registeredOwnershipDomains, unregisterOwnershipPort } from '../src/kernel/ownership/registry';
import type { OwnershipPort } from '../src/kernel/ownership/ports';

const def = getAction('contact.transfer_owner')!;
const decide = (source: Parameters<typeof decidePolicy>[0]['source'], extra: Partial<Parameters<typeof decidePolicy>[0]> = {}) =>
  withRequiredApproval(decidePolicy({ source, risk: def.risk, actionId: def.id, ...extra }), def, source);

describe('requiredApprovalSources (contact.transfer_owner)', () => {
  it('ui / api / system chạy như cũ', () => {
    expect(decide('ui')).toBe('run');
    expect(decide('api')).toBe('run');
    expect(decide('system')).toBe('run');
  });

  it('Trợ lý / agent / tác vụ luôn approval — kể cả autoSend, hội thoại đang phục vụ', () => {
    expect(decide('assistant')).toBe('approval');
    expect(decide('agent')).toBe('approval');
    expect(decide('agent', { servedConversation: true })).toBe('approval');
    expect(decide('task', { autoSend: true })).toBe('approval');
  });

  it('cấm vẫn là cấm; action không khai thì giữ bảng policy', () => {
    expect(withRequiredApproval('forbidden', def, 'agent')).toBe('forbidden');
    const plain = getAction('contact.update')!;
    expect(requiredApproval(plain, 'assistant')).toBe(false);
    expect(withRequiredApproval(decidePolicy({ source: 'agent', risk: plain.risk, actionId: plain.id }), plain, 'agent')).toBe('run');
  });
});

describe('ownership registry', () => {
  const port = (domain: OwnershipPort['domain']): OwnershipPort => ({ domain, apply: async () => ({ receipts: [], events: [] }), undo: async () => ({ events: [] }) });
  afterEach(() => unregisterOwnershipPort('quote'));

  it('thiếu port → 503, không giả 0', () => {
    unregisterOwnershipPort('quote');
    const e = (() => {
      try {
        ownershipPort('quote');
      } catch (err) {
        return err as AppError;
      }
    })();
    expect(e).toBeInstanceOf(AppError);
    expect(e?.httpStatus).toBe(503);
  });

  it('đăng ký lại cùng port là no-op; port khác cùng domain → lỗi boot', () => {
    const p = port('quote');
    registerOwnershipPort(p);
    registerOwnershipPort(p);
    expect(registeredOwnershipDomains()).toContain('quote');
    expect(() => registerOwnershipPort(port('quote'))).toThrow(/đã đăng ký/);
  });
});
