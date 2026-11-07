import { beforeEach, describe, expect, it } from 'vitest';
import { nextNotice, noticeFromEvent, useBillingNotices, type BillingNotice } from './billing-notices';

const n = (kind: BillingNotice['kind'], key: string, workspace = 'w1', level?: 80 | 95): BillingNotice => ({
  kind,
  key,
  workspace,
  ...(level ? { level } : {}),
});

describe('nextNotice', () => {
  it('chống trùng theo key (cùng event đến lại / nhiều tab)', () => {
    expect(nextNotice(null, ['e1'], n('exhausted', 'e1'))).toBeUndefined();
    expect(nextNotice(null, [], n('exhausted', 'e1'))).toMatchObject({ kind: 'exhausted' });
  });

  it('hết Credit không bị nhắc 80 / 95 đè; cùng loại liên tiếp không bật lại', () => {
    const ex = n('exhausted', 'e1');
    expect(nextNotice(ex, ['e1'], n('low', 'e2', 'w1', 95))).toBeUndefined();
    expect(nextNotice(ex, ['e1'], n('exhausted', 'local:2'))).toBeUndefined();
    expect(nextNotice(n('low', 'e1', 'w1', 80), ['e1'], n('low', 'e2', 'w1', 95))).toMatchObject({
      level: 95,
    });
  });

  it('restored chỉ thay thông báo hết Credit; workspace khác → không mang sang', () => {
    expect(nextNotice(null, [], n('restored', 'e3'))).toBeUndefined();
    expect(nextNotice(n('exhausted', 'e1'), ['e1'], n('restored', 'e3'))).toMatchObject({ kind: 'restored' });
    expect(nextNotice(n('exhausted', 'e1', 'w1'), ['e1'], n('restored', 'e3', 'w2'))).toBeUndefined();
    expect(nextNotice(n('exhausted', 'e1', 'w1'), ['e1'], n('exhausted', 'e4', 'w2'))).toMatchObject({
      workspace: 'w2',
    });
  });
});

describe('noticeFromEvent', () => {
  it('chỉ nhận gói tin hợp lệ', () => {
    expect(noticeFromEvent({ kind: 'low', level: 80, event_id: 'e' }, 'w')).toEqual({
      kind: 'low',
      level: 80,
      key: 'e',
      workspace: 'w',
    });
    expect(noticeFromEvent({ kind: 'low', event_id: 'e' }, 'w')).toBeNull();
    expect(noticeFromEvent({ kind: 'exhausted' }, 'w')).toBeNull();
    expect(noticeFromEvent({ kind: 'nope', event_id: 'e' }, 'w')).toBeNull();
    expect(noticeFromEvent(null, 'w')).toBeNull();
  });
});

describe('useBillingNotices', () => {
  beforeEach(() => useBillingNotices.setState({ current: null, seen: [] }));

  it('push / dismiss / reset khi đổi workspace', () => {
    const s = useBillingNotices.getState();
    s.push(n('exhausted', 'e1'));
    expect(useBillingNotices.getState().current?.kind).toBe('exhausted');
    s.push(n('exhausted', 'e1'));
    expect(useBillingNotices.getState().seen).toEqual(['e1', 'e1']);
    useBillingNotices.getState().reset('w1');
    expect(useBillingNotices.getState().current).not.toBeNull();
    useBillingNotices.getState().reset('w2');
    expect(useBillingNotices.getState().current).toBeNull();
    s.push(n('low', 'e5', 'w2', 80));
    useBillingNotices.getState().dismiss();
    expect(useBillingNotices.getState().current).toBeNull();
  });
});
