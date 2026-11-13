// TIP-022c §2.2a–2.2b (unit): lệnh NGƯỜI VẬN HÀNH cho quyết định báo giá — agent / tác vụ làm thay người (delegate, Cowork) không căn cứ ý
// định khách → executor luôn đẩy sang duyệt; lượt kênh (không người ra lệnh) không được leo thang (domain 403); Trợ lý / UI giữ policy.
// Verifier dòng duyệt: chỉ dòng đã quyết bởi người thật, đúng action / báo giá / run / người ra lệnh / nguồn, dấu báo giá ràng lúc xin
// duyệt khớp dấu hiện tại — `initiatedByUserId`, câu "Chủ nhà bảo" trong task, tin khách dán vào hay nhãn ý định model không tạo ra nó.
import { describe, expect, it } from 'vitest';
import { escalateOperatorDecision, operatorDecisionPath, quoteBinding, sealCustomerIntent, verifyOperatorDecision, QUOTE_BINDING_KEY } from '../src/kernel/actions/customer-intent';
import { verifyOperatorApproval } from '../src/ai/sales-behavior/command-provenance';
import type { ActionContext, TenantTx } from '../src/kernel/actions/action-context';

const AP = '0190f000-0000-7000-8000-0000000000a1';
const RUN = '0190f000-0000-7000-8000-0000000000b1';
const OWNER = '0190f000-0000-7000-8000-0000000000c1';
const QID = '0190f000-0000-7000-8000-0000000000d1';
const ctx = (o: Partial<ActionContext> = {}) => ({ workspaceId: 'w', source: 'agent', actor: { type: 'agent', id: 'a1' }, runId: RUN, onBehalfOfUserId: OWNER, authz: {}, ...o }) as unknown as ActionContext;
const quote = { id: QID, status: 'sent', version: 1, total: 1000n, updatedAt: new Date('2026-11-13T00:00:00Z') };
const fp = quoteBinding(quote)[QUOTE_BINDING_KEY]!;
const row = (o: Record<string, unknown> = {}) => ({ action_id: 'quote.mark_accepted', status: 'approved', run_id: RUN, source: 'agent', on_behalf_of_user_id: OWNER, decided_by: OWNER, preview: { bound: { [QUOTE_BINDING_KEY]: fp } }, input: { quote_id: QID }, ...o });
const tx = (r: unknown) => ({ $queryRaw: async () => (r ? [r] : []) }) as unknown as TenantTx;
const verify = (r: unknown, c = ctx({ approvalId: AP })) => verifyOperatorApproval(tx(r), c, 'quote.mark_accepted', { id: QID, fingerprint: fp });

describe('escalateOperatorDecision — chỉ agent / tác vụ LÀM THAY NGƯỜI', () => {
  it('delegate / Cowork không căn cứ → approval (cả write vốn chạy thẳng)', () => {
    expect(escalateOperatorDecision('run', ctx(), 'quote.mark_accepted')).toBe('approval');
    expect(escalateOperatorDecision('run', ctx({ source: 'task' }), 'quote.request_revision')).toBe('approval');
    expect(operatorDecisionPath(ctx())).toBe(true);
  });

  it('lượt kênh (không người ra lệnh) không leo thang — domain chặn 403; đã có handle khách → giữ nguyên', () => {
    expect(escalateOperatorDecision('run', ctx({ onBehalfOfUserId: undefined }), 'quote.mark_accepted')).toBe('run');
    const sealed = ctx();
    sealCustomerIntent(sealed, { receiptId: 'r', actionId: 'quote.mark_accepted', quoteId: QID, runId: RUN });
    expect(escalateOperatorDecision('run', sealed, 'quote.mark_accepted')).toBe('run');
  });

  it('Trợ lý / UI / action khác / đã duyệt / bị cấm → không đổi', () => {
    expect(escalateOperatorDecision('preview', ctx({ source: 'assistant', actor: { type: 'assistant', id: OWNER } }), 'quote.mark_accepted')).toBe('preview');
    expect(escalateOperatorDecision('run', ctx({ source: 'ui', actor: { type: 'user', id: OWNER } }), 'quote.mark_accepted')).toBe('run');
    expect(escalateOperatorDecision('run', ctx(), 'quote.send')).toBe('run');
    expect(escalateOperatorDecision('run', ctx({ approvalId: AP }), 'quote.mark_accepted')).toBe('run');
    expect(escalateOperatorDecision('forbidden', ctx(), 'quote.mark_accepted')).toBe('forbidden');
  });
});

describe('verifyOperatorApproval — duyệt của người thật, ràng đúng báo giá', () => {
  it('approved / edited đúng ràng buộc → hợp lệ', async () => {
    expect(await verify(row())).toMatchObject({ ok: true });
    expect(await verify(row({ status: 'edited' }))).toMatchObject({ ok: true });
  });

  it('chưa quyết / từ chối / hết hạn / không có duyệt → operator_unconfirmed', async () => {
    for (const status of ['pending', 'rejected', 'expired']) expect(await verify(row({ status }))).toEqual({ ok: false, reason: 'operator_unconfirmed', status: 403 });
    expect(await verify(row(), ctx())).toMatchObject({ ok: false, reason: 'operator_unconfirmed' });
    expect(await verify(row(), ctx({ approvalId: 'khong-phai-uuid' }))).toMatchObject({ ok: false, reason: 'operator_unconfirmed' });
  });

  it('khác action / báo giá / run / người ra lệnh / nguồn / không người duyệt → operator_mismatch', async () => {
    for (const o of [{ action_id: 'quote.mark_rejected' }, { input: { quote_id: 'khac' } }, { run_id: 'khac' }, { on_behalf_of_user_id: 'khac' }, { source: 'assistant' }, { decided_by: null }]) {
      expect(await verify(row(o))).toEqual({ ok: false, reason: 'operator_mismatch', status: 403 });
    }
    expect(await verify(null)).toMatchObject({ ok: false, reason: 'operator_mismatch' });
  });

  it('báo giá đổi sau khi xin duyệt → 409 quote_changed; dòng không ràng dấu → operator_unbound', async () => {
    const changed = quoteBinding({ ...quote, total: 2000n })[QUOTE_BINDING_KEY]!;
    expect(await verifyOperatorApproval(tx(row()), ctx({ approvalId: AP }), 'quote.mark_accepted', { id: QID, fingerprint: changed })).toEqual({ ok: false, reason: 'quote_changed', status: 409 });
    expect(await verify(row({ preview: { summary: 'x' } }))).toMatchObject({ ok: false, reason: 'operator_unbound' });
    // Dấu là dữ liệu server ghi lúc xin duyệt; dấu sai khác dấu hiện tại vẫn 409 — không tự làm mới đích.
    expect(await verify(row({ preview: { bound: { [QUOTE_BINDING_KEY]: 'gia' } } }))).toMatchObject({ ok: false, reason: 'quote_changed' });
  });

  it('cổng kernel đóng an toàn khi chưa đăng ký verifier', async () => {
    expect(await verifyOperatorDecision(tx(row()), ctx({ approvalId: AP }), 'quote.mark_accepted', { id: QID, fingerprint: fp })).toEqual({ ok: false, reason: 'operator_unverified', status: 403 });
  });
});
