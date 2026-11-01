import { describe, expect, it } from 'vitest';
import { assertTransition, nextState } from '../state/flow';
import { TICKET_FLOW, setStatusKey, slaStateOf } from './ticket-state';

const t = (s: string) => new Date(`2026-10-30T${s}:00Z`);

describe('TICKET_FLOW', () => {
  it('mở → xử lý → chờ → xử lý → đóng → mở lại', () => {
    expect(nextState(TICKET_FLOW, 'open', setStatusKey('in_progress'))).toBe('in_progress');
    expect(nextState(TICKET_FLOW, 'in_progress', setStatusKey('waiting'))).toBe('waiting');
    expect(nextState(TICKET_FLOW, 'waiting', 'ticket.customer_reply')).toBe('in_progress');
    expect(nextState(TICKET_FLOW, 'waiting', 'ticket.close')).toBe('closed');
    expect(nextState(TICKET_FLOW, 'closed', 'ticket.reopen')).toBe('open');
  });

  it('đã đóng không đổi trạng thái / đóng lại; chưa đóng không mở lại', () => {
    expect(() => assertTransition(TICKET_FLOW, 'closed', setStatusKey('in_progress'))).toThrow();
    expect(() => assertTransition(TICKET_FLOW, 'closed', 'ticket.close')).toThrow();
    expect(() => assertTransition(TICKET_FLOW, 'open', 'ticket.reopen')).toThrow();
    expect(nextState(TICKET_FLOW, 'open', setStatusKey('open'))).toBeNull();
  });
});

describe('slaStateOf', () => {
  const base = { status: 'open' as const, slaResult: null, start: t('08:00'), due: t('12:00'), pausedAt: null };
  it('trong hạn · sắp đến hạn (≥ 80% hoặc ≤ 60′) · quá hạn', () => {
    expect(slaStateOf({ ...base, now: t('09:00') })).toEqual({ state: 'ok', left_min: 180 });
    expect(slaStateOf({ ...base, now: t('11:15') }).state).toBe('risk');
    expect(slaStateOf({ ...base, start: t('00:00'), due: t('20:00'), now: t('17:00') }).state).toBe('risk');
    expect(slaStateOf({ ...base, now: t('12:30') })).toEqual({ state: 'breach', left_min: -30 });
  });

  it('đang dừng: đứng ở lúc dừng; đã đóng theo sla_result', () => {
    expect(slaStateOf({ ...base, pausedAt: t('09:00'), now: t('15:00') })).toEqual({ state: 'ok', left_min: 180 });
    expect(slaStateOf({ ...base, status: 'closed', slaResult: 'breached', now: t('09:00') })).toEqual({ state: 'breach', left_min: null });
  });
});
