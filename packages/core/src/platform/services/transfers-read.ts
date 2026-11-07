// Đọc đối soát cho màn /admin › Chuyển khoản (TIP-040 pha 3, AC06 / AC09, DC-372): hoá đơn chờ duyệt, giao dịch ngân hàng CHƯA khớp,
// yêu cầu liên hệ bán hàng (039). Lọc phía server trước LIMIT, keyset cursor (occurred_at / created_at desc, id desc), id trước rồi
// hydrate (deferred join — indexing §3). Không trả `raw` payload ngân hàng; nội dung chuyển khoản cắt 200 ký tự; liên hệ chỉ trả
// email / SĐT cho admin (không log).
import type { PlatformDb } from '@appchat/db';
import { AppError, BILL_INVOICE_STATUSES } from '@appchat/shared';
import { decodeCursor, encodeCursor } from '../../billing/services/ledger-reader';

const PAGE = 50;
const take = (n?: string) => {
  const v = n ? Number(n) : PAGE;
  if (!Number.isInteger(v) || v < 1 || v > 200) throw new AppError('VALIDATION_FAILED', 400, { limit: 'invalid' });
  return v;
};
const day = (v: string | undefined, field: string) => {
  if (!v) return undefined;
  const d = new Date(`${v}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(d.getTime())) throw new AppError('VALIDATION_FAILED', 400, { [field]: 'invalid' });
  return d;
};
const after = (c: { at: Date; id: string } | null, col: 'createdAt' | 'occurredAt') =>
  c ? { AND: [{ OR: [{ [col]: { lt: c.at } }, { [col]: c.at, id: { lt: c.id } }] }] } : {};

export interface TransferQuery {
  status?: string;
  workspace_id?: string;
  q?: string;
  provider?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: string;
}

export class TransfersReadService {
  constructor(private readonly db: PlatformDb) {}

  /** Hoá đơn theo trạng thái (mặc định chờ duyệt) — lọc workspace / mã. */
  async invoices(q: TransferQuery) {
    const status = q.status ?? 'pending_review';
    if (!(BILL_INVOICE_STATUSES as readonly string[]).includes(status)) throw new AppError('VALIDATION_FAILED', 400, { status: 'invalid' });
    if (q.workspace_id && !/^[0-9a-f-]{36}$/i.test(q.workspace_id)) throw new AppError('VALIDATION_FAILED', 400, { workspace_id: 'invalid' });
    const n = take(q.limit);
    const c = q.cursor ? decodeCursor(q.cursor) : null;
    const code = q.q?.trim().toUpperCase().slice(0, 40);
    const ids = await this.db.billingInvoice.findMany({
      where: { status: status as (typeof BILL_INVOICE_STATUSES)[number], ...(q.workspace_id ? { workspaceId: q.workspace_id } : {}), ...(code ? { OR: [{ code: { startsWith: code } }, { transferCode: { startsWith: code } }] } : {}), ...after(c, 'createdAt') },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: n + 1,
      select: { id: true, createdAt: true },
    });
    const page = ids.slice(0, n);
    const rows = page.length ? await this.db.billingInvoice.findMany({ where: { id: { in: page.map((r) => r.id) } } }) : [];
    const names = new Map((await this.db.workspace.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.workspaceId))] } }, select: { id: true, name: true } })).map((w) => [w.id, w.name]));
    const byId = new Map(rows.map((r) => [r.id, r]));
    return {
      data: page.map((p) => byId.get(p.id)!).map((r) => ({
        id: r.id,
        code: r.code,
        workspace_id: r.workspaceId,
        workspace_name: names.get(r.workspaceId) ?? '',
        kind: r.kind,
        item: r.item,
        amount: String(r.amount),
        transfer_code: r.transferCode,
        status: r.status,
        reported_at: r.reportedAt?.toISOString() ?? null,
        created_at: r.createdAt.toISOString(),
        vat_info: r.vatInfo,
      })),
      next_cursor: ids.length > n ? encodeCursor(page[page.length - 1]!) : null,
    };
  }

  /** Giao dịch tiền vào chưa gắn hoá đơn — lọc provider / ngày / nội dung chứa. */
  async unmatched(q: TransferQuery) {
    const n = take(q.limit);
    const c = q.cursor ? decodeCursor(q.cursor) : null;
    if (q.provider && !/^[a-z0-9_-]{1,20}$/.test(q.provider)) throw new AppError('VALIDATION_FAILED', 400, { provider: 'invalid' });
    const from = day(q.from, 'from');
    const to = day(q.to, 'to');
    const text = q.q?.trim().slice(0, 60);
    const ids = await this.db.bankTransaction.findMany({
      where: {
        matchedInvoiceId: null,
        direction: 'in',
        ...(q.provider ? { provider: q.provider } : {}),
        ...(from || to ? { occurredAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: new Date(to.getTime() + 86_400_000) } : {}) } } : {}),
        ...(text ? { content: { contains: text, mode: 'insensitive' as const } } : {}),
        ...after(c, 'occurredAt'),
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: n + 1,
      select: { id: true, occurredAt: true },
    });
    const page = ids.slice(0, n);
    const rows = page.length
      ? await this.db.bankTransaction.findMany({ where: { id: { in: page.map((r) => r.id) } }, select: { id: true, provider: true, providerTxId: true, amount: true, content: true, occurredAt: true } })
      : [];
    const byId = new Map(rows.map((r) => [r.id, r]));
    return {
      data: page.map((p) => byId.get(p.id)!).map((r) => ({
        id: r.id,
        provider: r.provider,
        provider_tx_id: r.providerTxId,
        amount: String(r.amount),
        content: r.content.slice(0, 200),
        occurred_at: r.occurredAt.toISOString(),
      })),
      next_cursor: ids.length > n ? encodeCursor({ createdAt: page[page.length - 1]!.occurredAt, id: page[page.length - 1]!.id }) : null,
    };
  }

  /** Yêu cầu liên hệ gói Doanh nghiệp (039) — hàng đợi cho đội vận hành. */
  async inquiries(q: TransferQuery) {
    const n = take(q.limit);
    const c = q.cursor ? decodeCursor(q.cursor) : null;
    const status = q.status ?? 'new';
    if (!['new', 'contacted', 'closed'].includes(status)) throw new AppError('VALIDATION_FAILED', 400, { status: 'invalid' });
    const rows = await this.db.salesInquiry.findMany({ where: { status, ...after(c, 'createdAt') }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: n + 1 });
    const page = rows.slice(0, n);
    const names = new Map((await this.db.workspace.findMany({ where: { id: { in: [...new Set(page.map((r) => r.workspaceId))] } }, select: { id: true, name: true } })).map((w) => [w.id, w.name]));
    return {
      data: page.map((r) => ({ id: r.id, workspace_id: r.workspaceId, workspace_name: names.get(r.workspaceId) ?? '', name: r.name, email: r.email, phone: r.phone, message: r.message, status: r.status, created_at: r.createdAt.toISOString() })),
      next_cursor: rows.length > n ? encodeCursor(page[page.length - 1]!) : null,
    };
  }
}
