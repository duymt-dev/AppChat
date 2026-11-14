// action_log.add_correction (REQ-E09c, DC-292, TIP-003e §4): ghi đính chính cho hành động đã GỬI ra ngoài (risk `send` — không hoàn tác
// được). Không có permission mới: người gọi phải có ĐÚNG permission của action gốc trong registry (vd `quote.send`) — người chỉ có
// `audit.view` bị 403 — và còn thấy bản ghi gốc theo data scope hiện hành (domain đăng ký `CorrectionScope` theo thực thể; bản ghi ngoài
// scope → 404 như không có). Mỗi lần ghi THÊM một mục `{ note, by, at }` vào mảng `correction[]` (khoá dòng log, không ghi đè mục cũ).
// Kernel trung lập: không import domain — thực thể gốc lấy từ `<entity>_id` trong input / result của log.
import { Inject, Injectable } from '@nestjs/common';
import { getAction, type ActionInput, type actionLogAddCorrection } from '@appchat/actions';
import { AppError, can, type AuthzContext, type PermissionKey } from '@appchat/shared';
import { CLOCK, type Clock } from '../clock';
import type { ActionContext, TenantTx } from './action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from './handler';
import { line, preview } from './preview-kit';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CorrectionEntry = { note: string; by: string | null; at: string };
/** Kiểm người gọi còn thấy bản ghi gốc (ném 404 / 403 có kiểu khi không). */
export type CorrectionScope = (tx: TenantTx, authz: AuthzContext, id: string) => Promise<unknown>;

const SCOPES = new Map<string, CorrectionScope>();

/** Domain đăng ký lúc nạp module (một thực thể một hàm; đăng ký lại thay thế — nhiều app Nest trong một tiến trình test). */
export function registerCorrectionScope(entity: string, fn: CorrectionScope): void {
  SCOPES.set(entity, fn);
}

type Log = { id: string; actionId: string; risk: string; status: string; actorId: string | null; onBehalf: string | null; input: unknown; result: unknown; correction: unknown };

async function lockLog(tx: TenantTx, id: string): Promise<Log> {
  const rows = UUID.test(id) ? await tx.$queryRaw<Log[]>`SELECT id, action_id AS "actionId", risk, status::text AS status, actor_id AS "actorId", on_behalf_of_user_id::text AS "onBehalf", input, result, correction FROM action_log WHERE id = ${id}::uuid FOR UPDATE` : [];
  if (!rows[0]) throw new AppError('NOT_FOUND', 404, { action_log_id: 'not_found' });
  return rows[0];
}

/** Bản ghi gốc của log: `<thực thể>_id` trong result rồi input — thực thể theo tiền tố action trước (`quote.send` → `quote_id`), rồi các
 *  thực thể đã đăng ký (`message.recall` → `conversation_id`). */
function recordOf(log: Log): { entity: string; id: string } | null {
  const own = log.actionId.split('.')[0]!;
  for (const entity of [own, ...[...SCOPES.keys()].filter((k) => k !== own)])
    for (const src of [log.result, log.input]) {
      const v = (src as Record<string, unknown> | null)?.[`${entity}_id`];
      if (typeof v === 'string' && v && SCOPES.has(entity)) return { entity, id: v };
    }
  return null;
}

/** Quyền action gốc + scope bản ghi gốc; log không phải `send` đã chạy xong → 409. */
async function assertCorrectable(ctx: ActionContext, tx: TenantTx, log: Log): Promise<void> {
  const def = getAction(log.actionId);
  const perm = def?.permission;
  if (!def || !perm || perm === 'platform_admin') throw new AppError('FORBIDDEN', 403, { permission: log.actionId });
  if (perm !== 'self' && !can(ctx.authz, perm as PermissionKey)) throw new AppError('FORBIDDEN', 403, { permission: perm });
  if (log.risk !== 'send' || log.status !== 'succeeded') throw new AppError('INVALID_STATE', 409, { action_log_id: 'not_sent' });
  const rec = recordOf(log);
  // Không xác định được bản ghi gốc (thực thể chưa đăng ký scope, vd `member.invite`) → chỉ người làm / người ra lệnh / Owner.
  if (rec) await SCOPES.get(rec.entity)!(tx, ctx.authz, rec.id);
  else if (!ctx.authz.isOwner && log.actorId !== ctx.authz.userId && log.onBehalf !== ctx.authz.userId) throw new AppError('FORBIDDEN', 403, { scope: 'unknown_record' });
}

const entriesOf = (v: unknown): CorrectionEntry[] => (Array.isArray(v) ? (v as CorrectionEntry[]) : []);

@Injectable()
@ActionHandler('action_log.add_correction')
export class ActionLogCorrectionHandler implements Handler<ActionInput<typeof actionLogAddCorrection>, { action_log_id: string; corrections: number }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof actionLogAddCorrection>, tx: TenantTx): Promise<HandlerOutcome<{ action_log_id: string; corrections: number }>> {
    const log = await lockLog(tx, input.action_log_id);
    await assertCorrectable(ctx, tx, log);
    const by = ctx.onBehalfOfUserId ?? (ctx.actor.type === 'user' ? ctx.actor.id : null);
    const next = [...entriesOf(log.correction), { note: input.note.trim(), by, at: this.clock.now().toISOString() }];
    await tx.actionLog.update({ where: { id: log.id }, data: { correction: next } });
    return { result: { action_log_id: log.id, corrections: next.length }, after: { action_log_id: log.id, index: next.length - 1 } };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof actionLogAddCorrection>, tx: TenantTx) {
    const log = await lockLog(tx, input.action_log_id);
    await assertCorrectable(ctx, tx, log);
    return preview('write', line(log.actionId, input.note.trim()), { changes: [{ entity: 'action_log', id: log.id, after: { correction: input.note.trim() } }] });
  }
}
