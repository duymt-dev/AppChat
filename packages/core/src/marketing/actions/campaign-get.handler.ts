// campaign.get (TIP-012c §5.3): Trợ lý / agent đọc một chiến dịch theo id, mã hoặc đúng tên — trạng thái, người gửi đã chốt, đếm kết quả
// giao thư theo biên nhận (accepted ≠ delivered, unknown giữ unknown), số mở chỉ từ sự kiện thật (SMTP / kênh không có → null). Người nhận
// chỉ đếm khách trong scope CRM của người hỏi (như màn chi tiết). Không nội dung, không địa chỉ người nhận.
import { Injectable } from '@nestjs/common';
import type { ActionInput, campaignGet } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { crmScopeSql } from '../../crm/public';
import { deliveryOf, listMailSenders, senderKey, senderView } from '../services/mail-sender';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SCAN = 5000;
type Out = { id: string; code: string; name: string; status: string; channel: string; sender: { kind: string; email: string | null; usable: boolean } | null; recipients: number; delivery: Record<string, number>; opened: number | null };

@Injectable()
@ActionHandler('campaign.get')
export class CampaignGetHandler implements Handler<ActionInput<typeof campaignGet>, Out> {
  async execute(ctx: ActionContext, i: ActionInput<typeof campaignGet>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const key = i.campaign_id.trim();
    const where = UUID.test(key) ? { id: key } : { OR: [{ code: key }, { name: key }] };
    const c = await tx.campaign.findFirst({ where: { ...where, deletedAt: null }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    if (!c) throw new AppError('NOT_FOUND', 404, { campaign_id: 'not_found' });
    const ids = await tx.$queryRaw<{ id: string }[]>`
      SELECT r.id FROM campaign_recipient r
      WHERE r.campaign_id = ${c.id}::uuid AND EXISTS (SELECT 1 FROM contact k WHERE k.id = r.contact_id AND k.deleted_at IS NULL AND ${crmScopeSql(ctx.authz)})
      ORDER BY r.id LIMIT ${SCAN}`;
    const delivery: Record<string, number> = {};
    let opened: number | null = null;
    if (c.senderKind === 'tenant_mail' && ids.length) {
      for (const v of (await deliveryOf(tx, c.id, ids.map((x) => x.id))).values()) delivery[v] = (delivery[v] ?? 0) + 1;
      const [o] = await tx.$queryRaw<{ n: bigint; smtp: boolean }[]>`
        SELECT count(*) FILTER (WHERE (d.facts->>'opened')::int > 0)::bigint AS n, bool_or(ic.connector_key = 'smtp') AS smtp
        FROM tenant_mail_delivery d JOIN integration_connection ic ON ic.id = d.connection_id
        WHERE d.campaign_id = ${c.id}::uuid AND d.subject_kind = 'campaign_recipient' AND d.dispatch_ref = ANY(${ids.map((x) => `cr_${x.id}`)}::text[])`;
      opened = o && !o.smtp ? Number(o.n) : null;
    }
    const mail = c.senderKind === 'tenant_mail' ? new Map((await listMailSenders(tx)).map((m) => [senderKey(m), m])) : new Map();
    const s = c.channel === 'email' ? senderView(c, mail) : null;
    return {
      result: {
        id: c.id, code: c.code, name: c.name, status: c.status, channel: c.channel,
        sender: s ? { kind: s.kind, email: s.kind === 'tenant_mail' ? s.email || null : null, usable: s.kind === 'tenant_mail' ? s.usable : true } : null,
        recipients: ids.length, delivery, opened,
      },
    };
  }
}
