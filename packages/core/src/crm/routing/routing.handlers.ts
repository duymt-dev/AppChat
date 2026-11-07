// lead_routing.update (TIP-042b, DC-238) — crm.reassign, risk config. Tạo rule (mặc định / ghi đè tài khoản) hoặc sửa theo CAS; chuyển
// tắt → bật chốt `enabled_at` (chỉ khách tạo sau mốc này được chia — không hồi tố). Preview nêu người nhận + "chỉ lead mới". Undo 24h trả
// cấu hình trước (CAS), không đảo chủ của lead đã cấp. Bản chiếu `assign_mode` của tài khoản kênh không phải nguồn chạy (canonical = rule).
import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { ActionInput, ActionPreview, leadRoutingUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import { uuidv7 } from '../../kernel/ids';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { created, preview, updated } from '../../kernel/actions/preview-kit';
import { needPlatform } from '../../kernel/tenant/platform-read';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { actorUserId } from '../services/access';
import { assertDraft, lockRule, poolUsers, ruleSnap, type RuleDraft, type RuleRow, type RuleSnap } from './routing.repo';

type In = ActionInput<typeof leadRoutingUpdate>;
type Out = { rule_id: string; version: number };

const draftOf = (i: In, cur?: RuleRow): RuleDraft => ({
  channelAccountId: cur ? cur.channelAccountId : (i.channel_account_id ?? null),
  enabled: i.enabled,
  mode: i.mode,
  userIds: i.team_id ? [] : (i.user_ids ?? (cur && !cur.teamId ? cur.userIds : [])),
  teamId: i.team_id !== undefined ? i.team_id : i.user_ids ? null : (cur?.teamId ?? null),
  fixedUserId: i.mode === 'by_channel' ? (i.fixed_user_id ?? cur?.fixedUserId ?? null) : null,
});

const view = (d: RuleDraft) => ({ enabled: d.enabled, mode: d.mode, user_ids: d.userIds, team_id: d.teamId, fixed_user_id: d.fixedUserId });

@Injectable()
@ActionHandler('lead_routing.update')
export class LeadRoutingUpdateHandler implements Handler<In, Out> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
  ) {}

  private async check(ctx: ActionContext, i: In, tx: TenantTx): Promise<{ cur: RuleRow | null; draft: RuleDraft }> {
    const p = needPlatform(this.platform, 'lead_routing.update');
    if (i.rule_id) {
      const cur = await lockRule(tx, i.rule_id, i.if_version);
      if (i.channel_account_id !== undefined && i.channel_account_id !== cur.channelAccountId) throw new AppError('VALIDATION_FAILED', 422, { channel_account_id: 'immutable' });
      return { cur, draft: await assertDraft(tx, p, ctx.workspaceId, draftOf(i, cur)) };
    }
    const draft = await assertDraft(tx, p, ctx.workspaceId, draftOf(i));
    const dup = await tx.leadRoutingRule.findFirst({ where: { channelAccountId: draft.channelAccountId }, select: { id: true } });
    if (dup) throw new AppError('CONFLICT', 409, { rule_id: dup.id });
    return { cur: null, draft };
  }

  async execute(ctx: ActionContext, i: In, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const { cur, draft } = await this.check(ctx, i, tx);
    const now = this.clock.now();
    const enabledAt = draft.enabled ? (cur?.enabled ? cur.enabledAt : now) : null;
    const data = { enabled: draft.enabled, enabledAt, mode: draft.mode, userIds: draft.userIds, teamId: draft.teamId, fixedUserId: draft.fixedUserId, configuredByUserId: actorUserId(ctx) ?? null };
    if (cur) {
      const r = (await tx.leadRoutingRule.update({ where: { id: cur.id }, data: { ...data, version: { increment: 1 } } })) as RuleRow;
      return { result: { rule_id: r.id, version: r.version }, before: ruleSnap(cur), after: ruleSnap(r) };
    }
    const id = uuidv7(now.getTime());
    const r = (await tx.leadRoutingRule.create({ data: { id, channelAccountId: draft.channelAccountId, ...data, version: 1, createdAt: now } })) as RuleRow;
    await tx.leadRoutingCursor.create({ data: { ruleId: id } });
    return { result: { rule_id: id, version: 1 }, after: ruleSnap(r) };
  }

  /** Trả cấu hình trước (CAS theo version sau khi sửa); rule vừa tạo → tắt (không xoá — giữ con trỏ / lịch sử quyết định). */
  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const a = log.after as RuleSnap;
    const b = log.before as RuleSnap | null;
    await lockRule(tx, a.id, a.version);
    const back = b
      ? { enabled: b.enabled, enabledAt: b.enabled_at ? new Date(b.enabled_at) : null, mode: b.mode, userIds: b.user_ids, teamId: b.team_id, fixedUserId: b.fixed_user_id }
      : { enabled: false, enabledAt: null };
    await tx.leadRoutingRule.update({ where: { id: a.id }, data: { ...back, version: { increment: 1 } } });
  }

  async preview(ctx: ActionContext, i: In, tx: TenantTx): Promise<ActionPreview> {
    const { cur, draft } = await this.check(ctx, i, tx);
    const pool = await poolUsers(tx, { userIds: draft.userIds, teamId: draft.teamId, fixedUserId: draft.fixedUserId, mode: draft.mode });
    const warnings = [draft.enabled && draft.mode !== 'manual' ? 'new_leads_only' : 'manual_queue', ...(draft.enabled && !cur?.enabled ? ['history_import_counts'] : [])];
    const before = cur ? { enabled: cur.enabled, mode: cur.mode, user_ids: cur.userIds, team_id: cur.teamId, fixed_user_id: cur.fixedUserId } : null;
    const changes = before && cur ? updated('lead_routing_rule', cur.id, before, view(draft)) : [created('lead_routing_rule', { channel_account_id: draft.channelAccountId, ...view(draft) })];
    return preview('config', draft.channelAccountId ?? 'default', { changes, count: pool.length, warnings });
  }
}
