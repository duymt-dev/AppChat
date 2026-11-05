// TIP-030b F3 spec 15: capability niêm phong của trang ký công khai phụ lục — chỉ đúng object ActionContext đã niêm phong mới qua; bản sao
// (serialize / spread / ctx HTTP giả nguồn system), sai action / phụ lục / idempotency key, sau khi xoá → 403. Capability bất biến (freeze).
// Handler public: preview luôn 403; execute không capability → 403 trước khi đụng DB.
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import type { ActionContext } from '../src/kernel/actions/action-context';
import { requireCapability, seal, unseal, type AppendixCapability } from '../src/contracts/appendix/capability';
import { AppendixPublicDeclineHandler, AppendixPublicOtpHandler, AppendixPublicSignHandler } from '../src/contracts/appendix/public.handlers';
import { appendixToken, readAppendixToken } from '../src/contracts/appendix/tokens';
import { signToken } from '../src/contracts/services/sign-link';

const AID = '0190f000-0000-7000-8000-0000000a0001';
const ctxOf = (o: Partial<ActionContext> = {}): ActionContext => ({ workspaceId: 'ws', source: 'system', actor: { type: 'system', id: 'appendix.public_sign' }, authz: { isOwner: false } as never, idempotencyKey: 'k1', ...o });
const cap = (o: Partial<AppendixCapability> = {}): AppendixCapability => ({
  action: 'contract.appendix_public_sign',
  tokenId: 't1',
  tokenHash: 'h',
  appendixId: AID,
  appendixVersion: 1,
  documentHash: 'd',
  signerId: 's1',
  idempotencyKey: 'k1',
  client: { ip: null, userAgent: null },
  ...o,
});
const forbidden = (fn: () => unknown) => expect(fn).toThrow(expect.objectContaining({ code: 'FORBIDDEN', httpStatus: 403 }));

describe('capability niêm phong', () => {
  it('đúng ctx + action + phụ lục + idempotency key → qua; capability bất biến', () => {
    const ctx = ctxOf();
    seal(ctx, cap());
    const c = requireCapability(ctx, 'contract.appendix_public_sign', AID);
    expect(c.signerId).toBe('s1');
    expect(Object.isFrozen(c)).toBe(true);
    expect(() => ((c as { signerId: string }).signerId = 'x')).toThrow();
    unseal(ctx);
  });

  it('ctx giả (bản sao / JSON / ctx mới cùng nội dung, kể cả Owner nguồn system) → 403', () => {
    const ctx = ctxOf();
    seal(ctx, cap());
    forbidden(() => requireCapability({ ...ctx }, 'contract.appendix_public_sign', AID));
    forbidden(() => requireCapability(JSON.parse(JSON.stringify(ctx)) as ActionContext, 'contract.appendix_public_sign', AID));
    forbidden(() => requireCapability(ctxOf({ authz: { isOwner: true } as never }), 'contract.appendix_public_sign', AID));
    unseal(ctx);
  });

  it('sai action / phụ lục / idempotency key / nguồn → 403; sau unseal → 403', () => {
    const ctx = ctxOf();
    seal(ctx, cap());
    forbidden(() => requireCapability(ctx, 'contract.appendix_public_decline', AID));
    forbidden(() => requireCapability(ctx, 'contract.appendix_public_sign', '0190f000-0000-7000-8000-0000000a0002'));
    const other = ctxOf({ idempotencyKey: 'k2' });
    seal(other, cap());
    forbidden(() => requireCapability(other, 'contract.appendix_public_sign', AID));
    const ui = ctxOf({ source: 'ui' });
    seal(ui, cap());
    forbidden(() => requireCapability(ui, 'contract.appendix_public_sign', AID));
    unseal(ctx);
    forbidden(() => requireCapability(ctx, 'contract.appendix_public_sign', AID));
  });

  it('handler public: preview luôn 403; execute không capability → 403 trước khi đụng DB', async () => {
    const tx = new Proxy({}, { get: () => { throw new Error('DB bị chạm'); } }) as never;
    const n = null as never;
    const handlers = [new AppendixPublicOtpHandler(n, n, n, n), new AppendixPublicDeclineHandler(n, n), new AppendixPublicSignHandler(n, n, n, n)];
    for (const h of handlers) {
      await expect(h.preview()).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(h.execute(ctxOf(), { appendix_id: AID, otp: '123456', signature_png: 'x', consent: true } as never, tx)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }
    await expect(new AppendixPublicSignHandler(n, n, n, n).prepare(ctxOf(), { appendix_id: AID } as never)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('token phụ lục — miền ký riêng', () => {
  const key = Buffer.alloc(32, 7);
  const id = '0190f000-0000-7000-8000-00000000aaaa';
  it('token phụ lục đọc được; token hợp đồng cha cùng id không đọc được ở phụ lục; sửa chữ ký → null', () => {
    expect(readAppendixToken(key, appendixToken(key, id))).toBe(id);
    expect(readAppendixToken(key, signToken(key, id))).toBeNull();
    expect(readAppendixToken(key, `${appendixToken(key, id).slice(0, -2)}xx`)).toBeNull();
    expect(readAppendixToken(Buffer.alloc(32, 8), appendixToken(key, id))).toBeNull();
  });
});
