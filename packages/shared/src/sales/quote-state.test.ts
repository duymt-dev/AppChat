import { describe, expect, it } from 'vitest';
import { AppError } from '../errors';
import { assertTransition, nextState } from '../state/flow';
import { QUOTE_FLOW, QUOTE_STATUSES, type QuoteStatusKey } from './quote-state';

// Bảng đầy đủ (state-machine §3): mọi cặp (trạng thái × action) — có trong bảng ra đúng đích, còn lại INVALID_TRANSITION.
const ACTIONS = [
  'quote.update', 'quote.delete', 'quote.submit_for_approval', 'quote.approve', 'quote.reject_internal', 'quote.send', 'quote.view',
  'quote.mark_accepted', 'quote.mark_rejected', 'quote.request_revision', 'quote.expire', 'quote.extend_validity', 'quote.supersede',
];
const WANT: Partial<Record<QuoteStatusKey, Record<string, QuoteStatusKey>>> = {
  draft: { 'quote.update': 'draft', 'quote.delete': 'draft', 'quote.submit_for_approval': 'pending_approval', 'quote.send': 'sent' },
  pending_approval: { 'quote.approve': 'approved', 'quote.reject_internal': 'draft' },
  approved: { 'quote.send': 'sent' },
  sent: { 'quote.view': 'viewed', 'quote.mark_accepted': 'accepted', 'quote.mark_rejected': 'rejected', 'quote.request_revision': 'revision_requested', 'quote.expire': 'expired', 'quote.extend_validity': 'sent' },
  viewed: { 'quote.mark_accepted': 'accepted', 'quote.mark_rejected': 'rejected', 'quote.request_revision': 'revision_requested', 'quote.expire': 'expired', 'quote.extend_validity': 'viewed' },
  revision_requested: { 'quote.supersede': 'superseded' },
  expired: { 'quote.extend_validity': 'sent' },
};

describe('QUOTE_FLOW', () => {
  it('mọi cặp trạng thái × action', () => {
    for (const s of QUOTE_STATUSES)
      for (const a of ACTIONS) {
        const to = WANT[s]?.[a] ?? null;
        expect(nextState(QUOTE_FLOW, s, a), `${s} × ${a}`).toBe(to);
        if (!to) expect(() => assertTransition(QUOTE_FLOW, s, a)).toThrow(AppError);
      }
  });

  it('trạng thái cuối: accepted / rejected / superseded', () => {
    expect(QUOTE_FLOW.terminal).toEqual(['accepted', 'rejected', 'superseded']);
  });
});
