import { describe, expect, it } from 'vitest';
import { assertTransition, nextState } from '../state/flow';
import { PRIVACY_FLOW, isTerminalPrivacyPhase } from './state';

describe('PRIVACY_FLOW', () => {
  it('accepted → fencing → inventory → erasing → verifying → completed_with_exceptions', () => {
    expect(nextState(PRIVACY_FLOW, 'accepted', 'privacy.step:fencing')).toBe('fencing');
    expect(nextState(PRIVACY_FLOW, 'fencing', 'privacy.step:inventory')).toBe('inventory');
    expect(nextState(PRIVACY_FLOW, 'inventory', 'privacy.step:erasing')).toBe('erasing');
    expect(nextState(PRIVACY_FLOW, 'erasing', 'privacy.step:verifying')).toBe('verifying');
    expect(nextState(PRIVACY_FLOW, 'verifying', 'privacy.step:completed')).toBe('completed_with_exceptions');
  });

  it('inventory / erasing / verifying có thể rẽ needs_review trước khi verifying', () => {
    expect(nextState(PRIVACY_FLOW, 'inventory', 'privacy.step:needs_review')).toBe('needs_review');
    expect(nextState(PRIVACY_FLOW, 'erasing', 'privacy.step:needs_review')).toBe('needs_review');
    expect(nextState(PRIVACY_FLOW, 'needs_review', 'privacy.step:erasing')).toBe('erasing');
    expect(nextState(PRIVACY_FLOW, 'needs_review', 'privacy.step:verifying')).toBe('verifying');
    expect(nextState(PRIVACY_FLOW, 'verifying', 'privacy.step:needs_review')).toBe('needs_review');
  });

  it('mọi pha trừ needs_review/completed có đường retry → retryable_failed, và khôi phục lại đúng pha', () => {
    expect(nextState(PRIVACY_FLOW, 'fencing', 'privacy.step:retry')).toBe('retryable_failed');
    expect(nextState(PRIVACY_FLOW, 'inventory', 'privacy.step:retry')).toBe('retryable_failed');
    expect(nextState(PRIVACY_FLOW, 'erasing', 'privacy.step:retry')).toBe('retryable_failed');
    expect(nextState(PRIVACY_FLOW, 'verifying', 'privacy.step:retry')).toBe('retryable_failed');
    expect(nextState(PRIVACY_FLOW, 'retryable_failed', 'privacy.step:erasing')).toBe('erasing');
  });

  it('completed_with_exceptions là trạng thái cuối — không có chuyển đi ra trong bảng', () => {
    expect(isTerminalPrivacyPhase('completed_with_exceptions')).toBe(true);
    expect(isTerminalPrivacyPhase('accepted')).toBe(false);
    expect(() => assertTransition(PRIVACY_FLOW, 'completed_with_exceptions', 'privacy.step:erasing')).toThrow();
  });

  it('không có action người dùng nào nhảy thẳng accepted → erasing (bỏ qua fence/inventory)', () => {
    expect(nextState(PRIVACY_FLOW, 'accepted', 'privacy.step:erasing')).toBeNull();
    expect(nextState(PRIVACY_FLOW, 'accepted', 'privacy.step:inventory')).toBeNull();
  });
});
