// Đọc Khách thân thiết (TIP-036, Blueprint §4.4 loyalty — shape packages/shared/src/api/loyalty.ts). Thành viên = khách trong scope crm
// của người xem (`loyalty.view`); không thấy → 404 (không lộ tồn tại / PII). Số liệu lấy từ sổ điểm thật: điểm (cache points_balance — cùng
// transaction với sổ), tích 12 tháng, đã dùng, sắp hết hạn (30 ngày), tổng chi, ngày tham gia, 5 giao dịch gần nhất (render theo locale).
import { AppError, createFmt, interpolate, normalizePhone, safePoints, serverMessages, type AuthzContext } from '@appchat/shared';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import { visibleContact } from '../../crm/public';
import { ledgerPage, type LedgerRowDb } from '../repos/ledger.repo';
import { memberAggs, memberIds, type MemberAgg, type MemberFilter } from '../repos/member.repo';
import { configDto, readConfig } from './config.service';

export interface Viewer {
  workspaceId: string;
  userId: string;
  authz: AuthzContext;
}
/** Người xem + locale / múi giờ (render dòng sổ, ngày). */
export interface LoyaltyViewer extends Viewer {
  locale: string;
  timeZone: string;
}

const EXPIRING_DAYS = 30;
const RECENT = 5;
const MAX_LIMIT = 100;
const MONTH_MS = 30.44 * 86_400_000;

type ContactRow = { id: string; name: string; phone: string | null; tierKey: string | null; pointsBalance: bigint; totalSpent: bigint; createdAt: Date; lastInteractionAt: Date };
const SELECT = { id: true, name: true, phone: true, tierKey: true, pointsBalance: true, totalSpent: true, createdAt: true, lastInteractionAt: true } as const;

/** Mã chứng từ của các dòng sổ (đơn / đề nghị) — một truy vấn mỗi loại. */
async function refCodes(tx: TenantTx, rows: LedgerRowDb[]): Promise<Map<string, string>> {
  const ids = (t: string) => [...new Set(rows.filter((r) => r.ref_type === t && r.ref_id).map((r) => r.ref_id!))];
  const [orders, invoices] = await Promise.all([
    ids('order').length ? tx.order.findMany({ where: { id: { in: ids('order') } }, select: { id: true, code: true } }) : [],
    ids('invoice').length ? tx.invoice.findMany({ where: { id: { in: ids('invoice') } }, select: { id: true, code: true } }) : [],
  ]);
  return new Map([...orders, ...invoices].map((x) => [x.id, x.code]));
}

export function ledgerText(locale: string, r: Pick<LedgerRowDb, 'kind' | 'reason' | 'note'>, code: string): string {
  const m = serverMessages(locale).loyalty;
  const reason = (m.reasons as Record<string, string>)[r.reason] ?? r.reason;
  const base = interpolate((m.ledger as Record<string, string>)[r.kind] ?? r.kind, { code, reason });
  return r.note ? `${base} · ${r.note}` : base;
}

export class MemberReadService {
  constructor(
    private readonly tenants: TenantDbResolver,
    private readonly platform: Pick<PlatformDb, 'user' | 'workspace'>,
    private readonly now: () => Date,
  ) {}

  /** Bổ sung locale người xem (→ workspace → vi) + múi giờ workspace. */
  async viewer(v: Viewer): Promise<LoyaltyViewer> {
    const [w, u] = await Promise.all([
      this.platform.workspace.findUnique({ where: { id: v.workspaceId }, select: { timezone: true, locale: true } }),
      this.platform.user.findUnique({ where: { id: v.userId }, select: { locale: true } }),
    ]);
    return { ...v, locale: u?.locale ?? w?.locale ?? 'vi', timeZone: w?.timezone ?? 'Asia/Ho_Chi_Minh' };
  }

  private tx<T>(v: LoyaltyViewer, fn: (tx: TenantTx) => Promise<T>): Promise<T> {
    return this.tenants.get(TenantContexts.fromMembership(v.workspaceId, v.userId)).then((db) => db.$transaction(fn));
  }

  private async rows(tx: TenantTx, v: LoyaltyViewer, contacts: ContactRow[], aggs: Map<string, MemberAgg>, ledgers: Map<string, LedgerRowDb[]>) {
    const fmt = createFmt({ locale: v.locale, timeZone: v.timeZone });
    const all = [...ledgers.values()].flat();
    const codes = await refCodes(tx, all);
    const now = this.now();
    return contacts.map((c) => {
      const a = aggs.get(c.id);
      const points = safePoints(c.pointsBalance);
      const idle = now.getTime() - c.lastInteractionAt.getTime();
      const status = now.getTime() - c.createdAt.getTime() < MONTH_MS ? 'new' : idle > 6 * MONTH_MS ? 'inactive' : 'active';
      return {
        contact_id: c.id,
        name: c.name,
        phone: c.phone ?? '',
        tier: c.tierKey ?? 'member',
        points,
        earned: safePoints(a?.earned ?? 0n),
        used: safePoints(a?.used ?? 0n),
        spent: String(c.totalSpent),
        status,
        joined: fmt.date(c.createdAt).slice(3),
        expiring: safePoints(a?.expiring ?? 0n),
        ledger: (ledgers.get(c.id) ?? []).map((r) => this.row(v, r, codes, fmt)),
        can_redeem: points > 0,
        can_adjust: v.authz.isOwner || v.authz.permissions.has('loyalty.adjust'),
      };
    });
  }

  private row(v: LoyaltyViewer, r: LedgerRowDb, codes: Map<string, string>, fmt: ReturnType<typeof createFmt>) {
    const code = r.ref_id ? (codes.get(r.ref_id) ?? '') : '';
    return {
      id: r.id,
      kind: r.kind,
      text: ledgerText(v.locale, r, code),
      delta: safePoints(r.delta),
      balance_after: safePoints(r.balance_after),
      at: `${fmt.date(r.created_at)} · ${fmt.time(r.created_at)}`,
      ref: r.ref_type && r.ref_id ? { type: r.ref_type, id: r.ref_id, ...(code ? { code } : {}) } : null,
      expires_at: r.expires_at ? r.expires_at.toISOString() : null,
    };
  }

  private windows(cfgMonths: number) {
    const now = this.now();
    return { now, from: new Date(now.getTime() - cfgMonths * MONTH_MS), until: new Date(now.getTime() + EXPIRING_DAYS * 86_400_000) };
  }

  async config(v: LoyaltyViewer) {
    return this.tx(v, async (tx) => configDto(await readConfig(tx)));
  }

  async members(v: LoyaltyViewer, f: MemberFilter, page: number, limit: number) {
    const lim = Math.min(Math.max(1, limit), MAX_LIMIT);
    const pg = Math.max(1, page);
    return this.tx(v, async (tx) => {
      const cfg = await readConfig(tx);
      const { ids, total } = await memberIds(tx, v.authz, f, { offset: (pg - 1) * lim, limit: lim });
      const w = this.windows(cfg.tierWindowMonths);
      const [contacts, aggs] = await Promise.all([tx.contact.findMany({ where: { id: { in: ids } }, select: SELECT }), memberAggs(tx, ids, w.from, w.now, w.until)]);
      const byId = new Map(contacts.map((c) => [c.id, c]));
      const data = await this.rows(tx, v, ids.map((id) => byId.get(id)!).filter(Boolean), aggs, new Map());
      return { data, next_cursor: null, meta: { total, page: pg, limit: lim } };
    });
  }

  async member(v: LoyaltyViewer, contactId: string) {
    return this.tx(v, (tx) => this.memberIn(tx, v, contactId));
  }

  async memberIn(tx: TenantTx, v: LoyaltyViewer, contactId: string) {
    const { contact } = await visibleContact(tx, v.authz, contactId);
    const cfg = await readConfig(tx);
    const w = this.windows(cfg.tierWindowMonths);
    const [aggs, recent] = await Promise.all([memberAggs(tx, [contact.id], w.from, w.now, w.until), ledgerPage(tx, contact.id, RECENT)]);
    return (await this.rows(tx, v, [contact], aggs, new Map([[contact.id, recent]])))[0]!;
  }

  async ledger(v: LoyaltyViewer, contactId: string, limit: number, cursor?: string) {
    const lim = Math.min(Math.max(1, limit), MAX_LIMIT);
    return this.tx(v, async (tx) => {
      const { contact } = await visibleContact(tx, v.authz, contactId);
      const cur = cursor ? decodeCursor(cursor) : undefined;
      const rows = await ledgerPage(tx, contact.id, lim + 1, cur);
      const page = rows.slice(0, lim);
      const codes = await refCodes(tx, page);
      const fmt = createFmt({ locale: v.locale, timeZone: v.timeZone });
      const last = page.at(-1);
      return { data: page.map((r) => this.row(v, r, codes, fmt)), next_cursor: rows.length > lim && last ? encodeCursor(last.created_at, last.id) : null };
    });
  }

  /** Tra theo SĐT (hộp "Thêm thành viên"): chỉ trong scope; ngoài scope → như không có (không lộ tồn tại / tên). */
  async lookup(v: LoyaltyViewer, phone: string) {
    const norm = normalizePhone(phone);
    if (!norm || norm.replace(/\D/g, '').length < 9) throw new AppError('VALIDATION_FAILED', 422, { phone: 'min' });
    return this.tx(v, async (tx) => {
      const c = await tx.contact.findFirst({ where: { phoneNorm: norm, deletedAt: null }, select: { id: true, name: true } });
      if (!c) return { member: null, contact: null };
      try {
        const member = await this.memberIn(tx, v, c.id);
        return member.points || member.ledger.length ? { member, contact: null } : { member: null, contact: { id: c.id, name: c.name } };
      } catch (e) {
        if (e instanceof AppError && e.httpStatus === 404) return { member: null, contact: null };
        throw e;
      }
    });
  }
}

const encodeCursor = (at: Date, id: string) => Buffer.from(`${at.toISOString()}|${id}`).toString('base64url');
function decodeCursor(c: string): { at: Date; id: string } {
  const [at, id] = Buffer.from(c, 'base64url').toString().split('|');
  const d = new Date(at ?? '');
  if (!id || Number.isNaN(d.getTime()) || !/^[0-9a-f-]{36}$/i.test(id)) throw new AppError('VALIDATION_FAILED', 422, { cursor: 'invalid' });
  return { at: d, id };
}
