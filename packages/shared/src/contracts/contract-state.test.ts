import { describe, expect, it } from 'vitest';
import { AppError } from '../errors';
import { assertTransition, nextState } from '../state/flow';
import { CONTRACT_FLOW, CONTRACT_STATUSES, contractChipOf, type ContractStatusKey } from './contract-state';

// Bảng đầy đủ (state-machine §3): mọi cặp (trạng thái × action) — có trong bảng ra đúng đích, còn lại INVALID_TRANSITION.
const ACTIONS = [
  'contract.update', 'contract.delete', 'contract.submit', 'contract.request_changes', 'contract.reject_internal', 'contract.approve_and_sign',
  'contract.send_for_signature', 'contract.remind_signer', 'contract.extend_sign_link', 'contract.sign', 'contract.decline', 'contract.link_expire',
  'contract.expire', 'contract.terminate',
];
const WANT: Partial<Record<ContractStatusKey, Record<string, ContractStatusKey>>> = {
  draft: { 'contract.update': 'draft', 'contract.delete': 'draft', 'contract.submit': 'pending_approval' },
  pending_approval: { 'contract.request_changes': 'draft', 'contract.reject_internal': 'draft', 'contract.approve_and_sign': 'pending_signature' },
  pending_signature: {
    'contract.send_for_signature': 'pending_signature', 'contract.remind_signer': 'pending_signature', 'contract.extend_sign_link': 'pending_signature',
    'contract.sign': 'signed', 'contract.decline': 'declined', 'contract.link_expire': 'declined',
  },
  signed: { 'contract.expire': 'expired', 'contract.terminate': 'terminated' },
};

describe('CONTRACT_FLOW', () => {
  it('mọi cặp trạng thái × action', () => {
    for (const s of CONTRACT_STATUSES)
      for (const a of ACTIONS) {
        const to = WANT[s]?.[a] ?? null;
        expect(nextState(CONTRACT_FLOW, s, a), `${s} × ${a}`).toBe(to);
        if (!to) expect(() => assertTransition(CONTRACT_FLOW, s, a)).toThrow(AppError);
      }
  });

  it('trạng thái cuối + chip: chờ duyệt gộp Nháp, chờ ký = pending', () => {
    expect(CONTRACT_FLOW.terminal).toEqual(['declined', 'expired', 'terminated']);
    expect(contractChipOf('pending_approval')).toBe('draft');
    expect(contractChipOf('pending_signature')).toBe('pending');
    expect(contractChipOf('terminated')).toBe('terminated');
  });
});
