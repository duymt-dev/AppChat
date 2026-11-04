// TIP-045b annex A3 — đổi Chủ sở hữu (identity/services/ownership-transfer): chỉ Owner hiện tại theo DB; mã băm, gắn người nhận + epoch,
// hạn 10 phút, sai 5 lần khoá, xin mã mới huỷ mã cũ, tiêu một lần; đổi nguyên tử (Owner mới role owner, Owner cũ manager, epoch tăng);
// chỉ nguồn UI của người (Trợ lý / agent / tác vụ bị chặn, Trợ lý không thấy action). DB thật + đồng thời: hardening-owner (integration).
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { AppError, PERMISSIONS } from '@appchat/shared';
import { getAction } from '@appchat/actions';
import type { PlatformTx } from '../src/kernel/actions/action-context';
import type { ActionContext } from '../src/kernel/actions/action-context';
import { requestTransferOtp, transferOwnership, maskEmail } from '../src/identity/services/ownership-transfer';
import { ownerUiOnly } from '../src/identity/actions/workspace-transfer-otp.handler';
import { sha256 } from '../src/identity/services/secrets';
import { allowedFor } from '../src/ai/assistant/catalog';

const WS = '0190f000-0000-7000-8000-000000000001';
const OWNER = '0190f000-0000-7000-8000-0000000000a1';
const LAN = '0190f000-0000-7000-8000-0000000000b2';
const HOA = '0190f000-0000-7000-8000-0000000000c3';
const T0 = new Date('2026-11-05T08:00:00Z');
const at = (min: number) => new Date(T0.getTime() + min * 60_000);

type Otp = { id: string; workspaceId: string; ownerUserId: string; targetUserId: string; authzEpoch: number; codeHash: string; attempts: number; expiresAt: Date; consumedAt: Date | null; consumedOperationId: string | null; createdAt: Date };

function fakeDb() {
  const ws = { id: WS, ownerUserId: OWNER, authzEpoch: 3 };
  const members = [
    { workspaceId: WS, userId: OWNER, roleKey: 'owner', status: 'active' },
    { workspaceId: WS, userId: LAN, roleKey: 'sales', status: 'active' },
    { workspaceId: WS, userId: HOA, roleKey: 'cs', status: 'removed' },
  ];
  const users = [{ id: OWNER, email: 'owner@spa.vn', locale: 'vi', emailVerifiedAt: T0 }];
  const otps: Otp[] = [];
  let seq = 0;
  const match = (o: Otp, w: Partial<Otp>) => Object.entries(w).every(([k, v]) => (o as unknown as Record<string, unknown>)[k] === v);
  const ptx = {
    $queryRaw: async () => [],
    workspace: {
      findUniqueOrThrow: async () => ({ ...ws }),
      update: async ({ data }: { data: { ownerUserId?: string; authzEpoch?: { increment: number } } }) => {
        if (data.ownerUserId) ws.ownerUserId = data.ownerUserId;
        if (data.authzEpoch) ws.authzEpoch += data.authzEpoch.increment;
        return { ...ws };
      },
    },
    membership: {
      findFirst: async ({ where }: { where: { userId: string; status: string } }) => {
        const m = members.find((x) => x.userId === where.userId && x.status === where.status);
        return m ? { ...m } : null;
      },
      update: async ({ where, data }: { where: { workspaceId_userId: { userId: string } }; data: { roleKey: string } }) => {
        const m = members.find((x) => x.userId === where.workspaceId_userId.userId)!;
        m.roleKey = data.roleKey;
        return m;
      },
    },
    user: { findUniqueOrThrow: async ({ where }: { where: { id: string } }) => users.find((u) => u.id === where.id)! },
    ownerTransferOtp: {
      create: async ({ data }: { data: Omit<Otp, 'attempts' | 'consumedAt' | 'consumedOperationId' | 'createdAt'> }) => {
        const row = { ...data, attempts: 0, consumedAt: null, consumedOperationId: null, createdAt: new Date(T0.getTime() + seq++) };
        otps.push(row);
        return row;
      },
      updateMany: async ({ where, data }: { where: Partial<Otp>; data: Partial<Otp> }) => {
        const hit = otps.filter((o) => match(o, where));
        for (const o of hit) Object.assign(o, data);
        return { count: hit.length };
      },
      findFirst: async ({ where }: { where: Partial<Otp> }) => otps.filter((o) => match(o, where)).sort((a, b) => +b.createdAt - +a.createdAt)[0] ?? null,
    },
  } as unknown as PlatformTx;
  const bumpFail = async (id: string) => void (otps.find((o) => o.id === id)!.attempts += 1);
  return { ptx, ws, members, otps, bumpFail };
}

const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'ok';
  } catch (e) {
    return e instanceof AppError ? `${e.code}:${JSON.stringify(e.fields)}` : String(e);
  }
};

describe('xin mã đổi Chủ sở hữu', () => {
  it('chỉ Owner hiện tại; người nhận phải là thành viên active khác', async () => {
    const d = fakeDb();
    expect(await code(requestTransferOtp(d.ptx, WS, LAN, OWNER, T0))).toBe('FORBIDDEN:{"owner":"not_owner"}');
    expect(await code(requestTransferOtp(d.ptx, WS, OWNER, OWNER, T0))).toBe('VALIDATION_FAILED:{"to_user_id":"self"}');
    expect(await code(requestTransferOtp(d.ptx, WS, OWNER, HOA, T0))).toBe('NOT_FOUND:{"to_user_id":"not_member"}');
  });

  it('chỉ lưu băm, gắn người nhận + epoch, hạn 10 phút; xin mã mới huỷ mã cũ; thư tới email Owner (che khi trả)', async () => {
    const d = fakeDb();
    const r1 = await requestTransferOtp(d.ptx, WS, OWNER, LAN, T0, '111111');
    expect(r1.sentTo).toBe(maskEmail('owner@spa.vn'));
    expect(r1.mail).toEqual({ to: 'owner@spa.vn', locale: 'vi', code: '111111' });
    expect(d.otps[0]).toMatchObject({ targetUserId: LAN, ownerUserId: OWNER, authzEpoch: 3, codeHash: sha256('111111'), expiresAt: at(10) });
    expect(JSON.stringify(d.otps)).not.toContain('111111');
    await requestTransferOtp(d.ptx, WS, OWNER, LAN, at(1), '222222');
    expect(d.otps[0]!.consumedAt).not.toBeNull();
    expect(await code(transferOwnership(d.ptx, WS, OWNER, { to_user_id: LAN, otp: '111111' }, at(2), 'op1', d.bumpFail))).toBe('OTP_INVALID:{"otp":"invalid"}');
  });
});

describe('xác nhận đổi Chủ sở hữu', () => {
  it('đúng mã → Owner mới role owner, Owner cũ manager, epoch tăng, mã tiêu một lần (gửi lại mã → hết hạn)', async () => {
    const d = fakeDb();
    await requestTransferOtp(d.ptx, WS, OWNER, LAN, T0, '123456');
    const r = await transferOwnership(d.ptx, WS, OWNER, { to_user_id: LAN, otp: '123456' }, at(3), 'op1', d.bumpFail);
    expect(r).toEqual({ previousOwner: OWNER, previousTargetRole: 'sales', newOwner: LAN, epoch: 4 });
    expect(d.ws.ownerUserId).toBe(LAN);
    expect(d.members.find((m) => m.userId === LAN)!.roleKey).toBe('owner');
    expect(d.members.find((m) => m.userId === OWNER)!.roleKey).toBe('manager');
    expect(d.otps[0]).toMatchObject({ consumedOperationId: 'op1' });
    // Owner cũ dùng lại mã: không còn là Owner theo DB.
    expect(await code(transferOwnership(d.ptx, WS, OWNER, { to_user_id: LAN, otp: '123456' }, at(4), 'op2', d.bumpFail))).toBe('FORBIDDEN:{"owner":"not_owner"}');
  });

  it('đổi người nhận / quyền đổi sau khi xin mã → mã chết (stale)', async () => {
    const d = fakeDb();
    await requestTransferOtp(d.ptx, WS, OWNER, LAN, T0, '123456');
    d.members.push({ workspaceId: WS, userId: HOA, roleKey: 'cs', status: 'active' });
    expect(await code(transferOwnership(d.ptx, WS, OWNER, { to_user_id: HOA, otp: '123456' }, at(1), 'op1', d.bumpFail))).toBe('OTP_INVALID:{"otp":"stale"}');
    d.ws.authzEpoch += 1;
    expect(await code(transferOwnership(d.ptx, WS, OWNER, { to_user_id: LAN, otp: '123456' }, at(1), 'op1', d.bumpFail))).toBe('OTP_INVALID:{"otp":"stale"}');
    expect(d.ws.ownerUserId).toBe(OWNER);
  });

  it('hết hạn sau 10 phút; sai 5 lần khoá kể cả khi sau đó nhập đúng', async () => {
    const d = fakeDb();
    await requestTransferOtp(d.ptx, WS, OWNER, LAN, T0, '123456');
    expect(await code(transferOwnership(d.ptx, WS, OWNER, { to_user_id: LAN, otp: '123456' }, at(10), 'op1', d.bumpFail))).toBe('OTP_INVALID:{"otp":"expired"}');
    await requestTransferOtp(d.ptx, WS, OWNER, LAN, at(11), '654321');
    for (let i = 0; i < 5; i++) expect(await code(transferOwnership(d.ptx, WS, OWNER, { to_user_id: LAN, otp: '000000' }, at(12), `f${i}`, d.bumpFail))).toBe('OTP_INVALID:{"otp":"invalid"}');
    expect(await code(transferOwnership(d.ptx, WS, OWNER, { to_user_id: LAN, otp: '654321' }, at(12), 'op2', d.bumpFail))).toBe('OTP_INVALID:{"otp":"expired"}');
    expect(d.ws.ownerUserId).toBe(OWNER);
  });

  it('người nhận bị gỡ giữa chừng → 404, không đổi gì', async () => {
    const d = fakeDb();
    await requestTransferOtp(d.ptx, WS, OWNER, LAN, T0, '123456');
    d.members.find((m) => m.userId === LAN)!.status = 'removed';
    expect(await code(transferOwnership(d.ptx, WS, OWNER, { to_user_id: LAN, otp: '123456' }, at(1), 'op1', d.bumpFail))).toBe('NOT_FOUND:{"to_user_id":"not_member"}');
    expect(d.ws).toMatchObject({ ownerUserId: OWNER, authzEpoch: 3 });
  });
});

describe('chỉ UI của người, không qua Trợ lý / agent', () => {
  const ctx = (source: ActionContext['source'], type: ActionContext['actor']['type'] = 'user') => ({ source, actor: { type, id: OWNER } }) as ActionContext;

  it('nguồn khác ui hoặc actor không phải người → FORBIDDEN', () => {
    expect(ownerUiOnly(ctx('ui'))).toBe(OWNER);
    for (const s of ['assistant', 'agent', 'task', 'api', 'system'] as const) expect(() => ownerUiOnly(ctx(s))).toThrow(AppError);
    expect(() => ownerUiOnly(ctx('ui', 'agent'))).toThrow(AppError);
  });

  it('ActionDef: config, không agentGrantable, otp là ô bí mật; Trợ lý không thấy kể cả với Owner', () => {
    const owner = { userId: OWNER, isOwner: true, permissions: new Set(PERMISSIONS), scope: {}, teamIds: [] } as never;
    for (const id of ['workspace.request_transfer_otp', 'workspace.transfer_ownership']) {
      const def = getAction(id)!;
      expect(def).toMatchObject({ risk: 'config', agentGrantable: false, db: 'platform', permission: 'workspace.transfer_ownership' });
      expect(allowedFor(def, owner)).toBe(false);
    }
    expect(getAction('workspace.transfer_ownership')!.secret).toEqual({ paths: ['otp'] });
  });
});
