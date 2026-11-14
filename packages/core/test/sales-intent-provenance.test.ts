// TIP-022c §2.2 (unit): phạm vi "cần căn cứ ý định khách" xác định từ dòng dõi runtime, không từ nhãn — đổi wrapper tool, vai trò custom,
// bỏ `servedConversationId`, đổi `source` giữa agent / task hay actor agent dưới nguồn khác đều không gỡ được; handle chỉ sống trên đúng
// ctx object đã niêm phong (sao chép / JSON / spread đều mất); người thật (ui / api) và Trợ lý giữ action chuẩn.
import { describe, expect, it } from 'vitest';
import { customerIntentOf, needsCustomerIntent, operatorDecisionPath, sealCustomerIntent } from '../src/kernel/actions/customer-intent';
import type { ActionContext } from '../src/kernel/actions/action-context';

const base = { workspaceId: 'w', source: 'agent', actor: { type: 'agent', id: 'a1' }, runId: 'r1', servedConversationId: 'c1', authz: {} } as unknown as ActionContext;
const h = { receiptId: 'rc', actionId: 'quote.mark_accepted' as const, quoteId: 'q1', runId: 'r1' };

describe('dòng dõi khách', () => {
  it('agent / task / actor agent dưới bất kỳ nguồn nào → cần căn cứ; bỏ servedConversationId vẫn cần', () => {
    expect(needsCustomerIntent(base)).toBe(true);
    expect(needsCustomerIntent({ ...base, servedConversationId: undefined } as ActionContext)).toBe(true);
    expect(needsCustomerIntent({ ...base, source: 'task' } as ActionContext)).toBe(true);
    expect(needsCustomerIntent({ ...base, source: 'api' } as ActionContext)).toBe(true);
    expect(needsCustomerIntent({ ...base, source: 'ui', actor: { type: 'user', id: 'u' } } as ActionContext)).toBe(false);
    expect(needsCustomerIntent({ ...base, source: 'assistant', actor: { type: 'assistant', id: 'u' } } as ActionContext)).toBe(false);
  });

  it('handle không đi qua sao chép / JSON / spread — chỉ đúng ctx đã niêm phong', () => {
    const c = { ...base } as ActionContext;
    sealCustomerIntent(c, h);
    expect(customerIntentOf(c)).toEqual(h);
    expect(customerIntentOf({ ...c })).toBeUndefined();
    expect(customerIntentOf(JSON.parse(JSON.stringify(c)) as ActionContext)).toBeUndefined();
    expect(customerIntentOf(Object.assign({}, c, { customerIntent: h }) as ActionContext)).toBeUndefined();
    expect(Object.isFrozen(customerIntentOf(c))).toBe(true);
  });

  it('đường người vận hành chỉ khi làm thay người và KHÔNG có căn cứ khách', () => {
    expect(operatorDecisionPath(base)).toBe(false);
    const op = { ...base, onBehalfOfUserId: 'u1' } as ActionContext;
    expect(operatorDecisionPath(op)).toBe(true);
    sealCustomerIntent(op, h);
    expect(operatorDecisionPath(op)).toBe(false);
    expect(operatorDecisionPath({ ...base, source: 'assistant', actor: { type: 'assistant', id: 'u1' }, onBehalfOfUserId: 'u1' } as ActionContext)).toBe(false);
  });
});
