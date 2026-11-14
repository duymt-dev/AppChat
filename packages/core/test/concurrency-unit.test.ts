// TIP-003e (concurrency §1, DC-292): helper CAS `assertIfVersion`, cờ hoàn tác `withUndoAllowance` (chỉ ở helper + UndoService gọi trong
// transaction hoàn tác), handler đính chính kiểm quyền action gốc trước mọi ghi; trigger migration đúng ba bảng, không chặn bảng có UPDATE hợp lệ.
import 'reflect-metadata';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { authzForRole, type AppError } from '@appchat/shared';
import { getAction, actionLogAddCorrection, agentUpdate, invoiceSendPaymentQr, invoiceVoid, ticketAssign, ticketClose, ticketReopen, ticketSetStatus, ticketUpdate } from '@appchat/actions';
import { assertIfVersion } from '../src/kernel/actions/cas';
import { withUndoAllowance } from '../src/kernel/actions/undo-allowance';
import { ActionLogCorrectionHandler, registerCorrectionScope } from '../src/kernel/actions/correction.handler';
import type { ActionContext, TenantTx } from '../src/kernel/actions/action-context';

const SRC = join(import.meta.dirname, '..', '..', '..');
const err = (fn: () => unknown): Partial<AppError> | null => {
  try {
    fn();
    return null;
  } catch (e) {
    return e as AppError;
  }
};

describe('assertIfVersion', () => {
  it('không gửi → qua; khớp → qua; lệch → 409 STALE_VERSION kèm version hiện tại', () => {
    expect(err(() => assertIfVersion(3, undefined))).toBeNull();
    expect(err(() => assertIfVersion(3, 3))).toBeNull();
    expect(err(() => assertIfVersion(4, 3))).toMatchObject({ code: 'STALE_VERSION', httpStatus: 409, fields: { version: '4' } });
  });

  it('action ticket / đề nghị / agent nhận if_version tuỳ chọn (số nguyên dương)', () => {
    for (const def of [ticketUpdate, ticketAssign, ticketSetStatus, ticketClose, ticketReopen, invoiceSendPaymentQr, invoiceVoid, agentUpdate]) {
      const shape = (def.input as unknown as { shape: Record<string, { safeParse: (v: unknown) => { success: boolean } }> }).shape;
      expect(shape.if_version, def.id).toBeDefined();
      expect(shape.if_version!.safeParse(undefined).success, def.id).toBe(true);
      expect(shape.if_version!.safeParse(2).success, def.id).toBe(true);
      expect(shape.if_version!.safeParse(0).success, def.id).toBe(false);
    }
  });
});

describe('withUndoAllowance', () => {
  it('đặt cờ bằng SET LOCAL (tự hết khi commit / rollback)', async () => {
    const exec = vi.fn(async () => 0);
    await withUndoAllowance({ $executeRaw: exec } as unknown as TenantTx);
    const [strings] = exec.mock.calls[0] as unknown as [TemplateStringsArray];
    expect(strings.join('?')).toBe(`SET LOCAL app.undo_allow = 'on'`);
  });

  it('`app.undo_allow` chỉ xuất hiện ở helper (mã) + migration trigger — không đường xoá nào khác tự đặt cờ', () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        if (['node_modules', 'dist', '.next', 'generated', '.turbo', 'coverage', 'test', 'e2e', 'test-results', 'public', 'messages'].includes(f)) continue;
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx|mjs|sql)$/.test(f) && !/\.test\.ts$/.test(f) && readFileSync(p, 'utf8').includes('app.undo_allow')) hits.push(p.slice(SRC.length + 1).replace(/\\/g, '/'));
      }
    };
    for (const root of ['packages', 'apps']) walk(join(SRC, root));
    expect(hits.sort()).toEqual([
      'packages/core/src/kernel/actions/undo-allowance.ts',
      'packages/db/prisma/tenant/migrations/20261114040000_action_integrity/migration.sql',
    ]);
  }, 30_000);

  it('UndoService gọi helper ngay trước handler.undo trong transaction hoàn tác; executor không gọi', () => {
    const undo = readFileSync(join(SRC, 'packages/core/src/kernel/actions/undo.service.ts'), 'utf8');
    expect(undo).toMatch(/await withUndoAllowance\(tx\);\s*await handler\.undo\(/);
    expect(readFileSync(join(SRC, 'packages/core/src/kernel/actions/executor.ts'), 'utf8')).not.toMatch(/withUndoAllowance/);
  });
});

describe('migration action_integrity', () => {
  const sql = readFileSync(join(SRC, 'packages/db/prisma/tenant/migrations/20261114040000_action_integrity/migration.sql'), 'utf8');
  it('UPDATE / TRUNCATE / DELETE guard đúng ba bảng sự kiện; không chặn action_log / timeline_event / integration_event', () => {
    for (const t of ['stock_movement', 'order_event', 'ticket_event']) {
      expect(sql).toContain(`"${t}_no_update" BEFORE UPDATE ON "${t}"`);
      expect(sql).toContain(`"${t}_no_truncate" BEFORE TRUNCATE ON "${t}"`);
      expect(sql).toContain(`"${t}_delete_guard" BEFORE DELETE ON "${t}"`);
    }
    for (const t of ['action_log', 'timeline_event', 'integration_event']) expect(sql).not.toMatch(new RegExp(`ON "${t}"\\s+FOR EACH`));
  });
  it('ai_agent.row_version + invoice version tăng bằng trigger (một nguồn)', () => {
    expect(sql).toMatch(/ALTER TABLE "ai_agent" ADD COLUMN "row_version" INTEGER NOT NULL DEFAULT 1/);
    expect(sql).toMatch(/CREATE TRIGGER "ai_agent_bump_row_version" BEFORE UPDATE ON "ai_agent"/);
    expect(sql).toMatch(/CREATE TRIGGER "invoice_bump_version" BEFORE UPDATE ON "invoice"/);
    expect(sql).toMatch(/ALTER TABLE "action_log" ADD COLUMN "correction" JSONB/);
  });
});

describe('action_log.add_correction (handler)', () => {
  const LOG = '0190f000-0000-7000-8000-0000000c0e21';
  const row = (o: Partial<{ actionId: string; risk: string; status: string; correction: unknown; actorId: string | null }> = {}) => ({
    id: LOG, actionId: 'quote.send', risk: 'send', status: 'succeeded', actorId: 'u_owner', onBehalf: null, input: { quote_id: 'q1' }, result: { quote_id: 'q1' }, correction: null, ...o,
  });
  const txOf = (r: ReturnType<typeof row>) => {
    const update = vi.fn(async () => ({}));
    return { tx: { $queryRaw: vi.fn(async () => [r]), actionLog: { update } } as unknown as TenantTx, update };
  };
  const ctx = (role: 'owner' | 'sales' | 'cs' | 'accountant', id = 'u_x'): ActionContext => ({ workspaceId: 'ws', source: 'ui', actor: { type: 'user', id }, authz: authzForRole(role, id) }) as unknown as ActionContext;
  const h = new ActionLogCorrectionHandler({ now: () => new Date('2026-11-14T05:00:00Z') } as never);

  it('định nghĩa: permission self (handler kiểm quyền action gốc), risk write, không agentGrantable, không undo', () => {
    expect(getAction('action_log.add_correction')).toBe(actionLogAddCorrection);
    expect(actionLogAddCorrection).toMatchObject({ permission: 'self', risk: 'write', agentGrantable: false });
    expect(actionLogAddCorrection.undo).toBeUndefined();
  });

  it('thiếu permission action gốc (cs không có quote.send) → 403, không ghi', async () => {
    const { tx, update } = txOf(row());
    await expect(h.execute(ctx('cs'), { action_log_id: LOG, note: 'x' }, tx)).rejects.toMatchObject({ code: 'FORBIDDEN', httpStatus: 403 });
    expect(update).not.toHaveBeenCalled();
  });

  it('log không phải send / chưa chạy xong → 409 INVALID_STATE', async () => {
    registerCorrectionScope('quote', async () => ({}));
    await expect(h.execute(ctx('owner'), { action_log_id: LOG, note: 'x' }, txOf(row({ risk: 'write', actionId: 'quote.update' })).tx)).rejects.toMatchObject({ code: 'INVALID_STATE' });
    await expect(h.execute(ctx('owner'), { action_log_id: LOG, note: 'x' }, txOf(row({ status: 'failed' })).tx)).rejects.toMatchObject({ code: 'INVALID_STATE' });
  });

  it('scope bản ghi gốc do domain đăng ký: ngoài scope → lỗi của domain (404), không ghi', async () => {
    const nf = Object.assign(new Error('nf'), { code: 'NOT_FOUND', status: 404 });
    registerCorrectionScope('quote', async () => {
      throw nf;
    });
    const { tx, update } = txOf(row());
    await expect(h.execute(ctx('sales'), { action_log_id: LOG, note: 'x' }, tx)).rejects.toBe(nf);
    expect(update).not.toHaveBeenCalled();
  });

  it('thêm mục vào cuối mảng (giữ mục cũ), người ghi = người dùng hiện tại', async () => {
    registerCorrectionScope('quote', async () => ({}));
    const old = [{ note: 'cũ', by: 'u_a', at: '2026-11-13T00:00:00.000Z' }];
    const { tx, update } = txOf(row({ correction: old }));
    const out = await h.execute(ctx('owner', 'u_owner'), { action_log_id: LOG, note: '  mới  ' }, tx);
    expect(out.result).toEqual({ action_log_id: LOG, corrections: 2 });
    expect(update).toHaveBeenCalledWith({ where: { id: LOG }, data: { correction: [...old, { note: 'mới', by: 'u_owner', at: '2026-11-14T05:00:00.000Z' }] } });
  });

  it('không xác định được bản ghi gốc (member.invite) → chỉ người làm / Owner', async () => {
    const r = row({ actionId: 'member.invite', actorId: 'u_inviter' });
    r.input = { email: 'a@b.c' } as never;
    r.result = {} as never;
    const mgr = ctx('owner', 'u_inviter');
    expect((await h.execute(mgr, { action_log_id: LOG, note: 'x' }, txOf(r).tx)).result.corrections).toBe(1);
  });
});
