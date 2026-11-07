// Ví credit (Blueprint §2.2, §2.0 "nền tảng trước"): mọi thay đổi số dư là một transaction ở DB nền tảng, khoá dòng ví
// (`FOR UPDATE`), ghi `credit_ledger` với khoá idempotent `(workspace, ref_type, ref_id)`. Trừ plan_balance trước, topup sau.
// Sau commit: cờ ngưỡng (80 / 95% hạn mức tháng, hết, có lại) → listener (billing.module phát event qua outbox tenant).
import { AppError, warnLevel } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { PlatformTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';

export type CreditKindName = 'grant' | 'topup' | 'usage' | 'refund' | 'adjust' | 'expire';

export interface LedgerInput {
  refType: string;
  refId: string;
  /** Khoá chữ mô tả (render theo locale người xem — i18n/server billing.ledger) + tham số. */
  note?: string;
  meta?: Record<string, string | number>;
  /** Khoá nguồn hiển thị (assistant, inbox, plan, qr…). */
  source?: string;
  provider?: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  runId?: string;
}

export interface Balance {
  plan: number;
  topup: number;
  total: number;
}

export interface WalletChange {
  workspaceId: string;
  before: Balance;
  after: Balance;
  /** false = ref đã ghi trước đó (idempotent) — số dư không đổi. */
  applied: boolean;
  creditsMonth: number | null;
  ledgerId: string;
}

export interface WalletFlags {
  lowAlert: boolean;
  /** Vừa chạm mức (một lần mỗi kỳ). */
  warned: 80 | 95 | null;
  exhausted: boolean;
  restored: boolean;
}

export type WalletListener = (c: WalletChange, flags: WalletFlags) => Promise<void>;

type Raw = { planBalance: bigint; topupBalance: bigint };
type Next = (w: Raw) => Raw;

const bal = (w: Raw): Balance => ({ plan: Number(w.planBalance), topup: Number(w.topupBalance), total: Number(w.planBalance + w.topupBalance) });

export class WalletService {
  private listener: WalletListener | null = null;

  constructor(
    private readonly db: PlatformDb,
    private readonly now: () => Date = () => new Date(),
  ) {}

  onChange(l: WalletListener | null): void {
    this.listener = l;
  }

  async balance(workspaceId: string): Promise<Balance> {
    const w = await this.db.creditWallet.findUnique({ where: { workspaceId } });
    return w ? bal(w) : { plan: 0, topup: 0, total: 0 };
  }

  /** Trước mỗi bước AI (Blueprint §5.1): ví ≤ 0 → CREDIT_EXHAUSTED 402. */
  async assertBalance(workspaceId: string): Promise<void> {
    if ((await this.balance(workspaceId)).total <= 0) throw new AppError('CREDIT_EXHAUSTED', 402);
  }

  /** Trừ credit (usage). Thiếu → CREDIT_EXHAUSTED, không trừ một phần. Cùng ref lần 2 → không trừ lại. */
  charge(workspaceId: string, credits: number, l: LedgerInput): Promise<WalletChange> {
    if (!Number.isInteger(credits) || credits < 0) throw new AppError('VALIDATION_FAILED', 400, { credits: 'invalid' });
    return this.apply(workspaceId, 'usage', -credits, l, (w) => {
      if (BigInt(credits) > w.planBalance + w.topupBalance) throw new AppError('CREDIT_EXHAUSTED', 402);
      const fromPlan = BigInt(credits) < w.planBalance ? BigInt(credits) : w.planBalance;
      return { planBalance: w.planBalance - fromPlan, topupBalance: w.topupBalance - (BigInt(credits) - fromPlan) };
    });
  }

  /** Nạp credit mua thêm (không hết hạn) — TIP-010 gọi khi hoá đơn credit được trả. `tx` = trong transaction người gọi (tự `emit` sau commit). */
  async topup(workspaceId: string, credits: number, l: LedgerInput, tx?: PlatformTx): Promise<WalletChange> {
    const next: Next = (w) => ({ planBalance: w.planBalance, topupBalance: w.topupBalance + BigInt(credits) });
    if (!tx) return this.apply(workspaceId, 'topup', credits, l, next);
    return this.applyIn(tx, workspaceId, 'topup', credits, l, next);
  }

  /** Credit chênh khi nâng gói giữa kỳ (TIP-039, DC-242): cộng vào plan bucket (không reset phần đã dùng, không đụng topup). Trong tx người gọi. */
  addPlan(tx: PlatformTx, workspaceId: string, credits: number, l: LedgerInput): Promise<WalletChange> {
    if (!Number.isSafeInteger(credits) || credits < 0) throw new AppError('VALIDATION_FAILED', 400, { credits: 'invalid' });
    return this.applyIn(tx, workspaceId, 'grant', credits, l, (w) => ({ planBalance: w.planBalance + BigInt(credits), topupBalance: w.topupBalance }));
  }

  /** Gói trả phí hết hạn (TIP-039): Credit gói còn lại hết hạn (`expire`), topup giữ nguyên. Idempotent theo ref. Trong tx người gọi. */
  async expirePlan(tx: PlatformTx, workspaceId: string, l: LedgerInput): Promise<WalletChange> {
    const w = await this.lock(tx, workspaceId);
    const dup = await this.findRef(tx, workspaceId, l);
    if (dup || w.planBalance === 0n) return this.unchanged(tx, workspaceId, w, dup ?? { id: '' });
    const n = { planBalance: 0n, topupBalance: w.topupBalance };
    await tx.creditWallet.update({ where: { workspaceId }, data: { planBalance: 0n } });
    const ledgerId = await this.write(tx, workspaceId, 'expire', -Number(w.planBalance), l, n);
    return { workspaceId, before: bal(w), after: bal(n), applied: true, creditsMonth: await this.creditsMonth(tx, workspaceId), ledgerId };
  }

  /** Điều chỉnh tay (Quản trị nền tảng — TIP-040) / hoàn credit: ± vào topup; không cho âm. */
  adjust(workspaceId: string, delta: number, l: LedgerInput, kind: 'adjust' | 'refund' = 'adjust'): Promise<WalletChange> {
    return this.apply(workspaceId, kind, delta, l, (w) => {
      const topup = w.topupBalance + BigInt(delta);
      if (topup < 0n) throw new AppError('VALIDATION_FAILED', 400, { delta: 'below_zero' });
      return { planBalance: w.planBalance, topupBalance: topup };
    });
  }

  /**
   * Credit gói của kỳ mới (không cộng dồn — Blueprint §2.2): `expire` phần plan còn lại rồi `grant` hạn mức mới; xoá mốc
   * cảnh báo của kỳ cũ. Idempotent theo `refId` (vd. `trial:<ws>`, `period:<ws>:<yyyy-mm>`). `tx` = trong transaction
   * của người gọi (subscription) — khi đó người gọi tự gọi `emit(change)` sau commit.
   */
  async resetPlan(workspaceId: string, credits: number, l: LedgerInput, tx?: PlatformTx): Promise<WalletChange> {
    const run = async (t: PlatformTx) => {
      const w = await this.lock(t, workspaceId);
      const dup = await this.findRef(t, workspaceId, l);
      if (dup) return this.unchanged(t, workspaceId, w, dup);
      if (w.planBalance > 0n) await this.write(t, workspaceId, 'expire', -Number(w.planBalance), { ...l, refType: `${l.refType}:expire`, note: 'plan_expire', meta: undefined }, { planBalance: 0n, topupBalance: w.topupBalance });
      await t.creditWallet.update({ where: { workspaceId }, data: { warn80SentAt: null, warn95SentAt: null } });
      return this.applyIn(t, workspaceId, 'grant', credits, l, () => ({ planBalance: BigInt(credits), topupBalance: w.topupBalance }));
    };
    const change = tx ? await run(tx) : await this.db.$transaction(run);
    if (!tx) await this.emit(change);
    return change;
  }

  private async apply(workspaceId: string, kind: CreditKindName, delta: number, l: LedgerInput, next: Next): Promise<WalletChange> {
    const change = await this.db.$transaction((t) => this.applyIn(t, workspaceId, kind, delta, l, next));
    await this.emit(change);
    return change;
  }

  private async applyIn(t: PlatformTx, workspaceId: string, kind: CreditKindName, delta: number, l: LedgerInput, next: Next): Promise<WalletChange> {
    const w = await this.lock(t, workspaceId);
    const dup = await this.findRef(t, workspaceId, l);
    if (dup) return this.unchanged(t, workspaceId, w, dup);
    const n = next(w);
    await t.creditWallet.update({ where: { workspaceId }, data: { planBalance: n.planBalance, topupBalance: n.topupBalance } });
    const ledgerId = await this.write(t, workspaceId, kind, delta, l, n);
    return { workspaceId, before: bal(w), after: bal(n), applied: true, creditsMonth: await this.creditsMonth(t, workspaceId), ledgerId };
  }

  private findRef(t: PlatformTx, workspaceId: string, l: LedgerInput) {
    return t.creditLedger.findUnique({ where: { workspaceId_refType_refId: { workspaceId, refType: l.refType, refId: l.refId } }, select: { id: true } });
  }

  private async unchanged(t: PlatformTx, workspaceId: string, w: Raw, dup: { id: string }): Promise<WalletChange> {
    return { workspaceId, before: bal(w), after: bal(w), applied: false, creditsMonth: await this.creditsMonth(t, workspaceId), ledgerId: dup.id };
  }

  private async write(t: PlatformTx, workspaceId: string, kind: CreditKindName, delta: number, l: LedgerInput, after: Raw): Promise<string> {
    const id = uuidv7(this.now().getTime());
    await t.creditLedger.create({
      data: {
        id,
        workspaceId,
        delta: BigInt(delta),
        balanceAfter: after.planBalance + after.topupBalance,
        kind,
        refType: l.refType,
        refId: l.refId,
        note: l.note ?? null,
        meta: l.meta,
        source: l.source ?? null,
        provider: l.provider ?? null,
        model: l.model ?? null,
        tokensIn: l.tokensIn ?? null,
        tokensOut: l.tokensOut ?? null,
        runId: l.runId ?? null,
        createdAt: this.now(),
      },
    });
    return id;
  }

  /** Tạo ví nếu chưa có rồi khoá dòng (SELECT … FOR UPDATE) — các charge song song xếp hàng ở đây. */
  private async lock(t: PlatformTx, workspaceId: string): Promise<Raw> {
    await t.creditWallet.upsert({ where: { workspaceId }, create: { workspaceId }, update: {} });
    const rows = await t.$queryRaw<{ plan_balance: bigint; topup_balance: bigint }[]>`SELECT plan_balance, topup_balance FROM credit_wallet WHERE workspace_id = ${workspaceId}::uuid FOR UPDATE`;
    return { planBalance: BigInt(rows[0]!.plan_balance), topupBalance: BigInt(rows[0]!.topup_balance) };
  }

  private async creditsMonth(t: PlatformTx, workspaceId: string): Promise<number | null> {
    const s = await t.subscription.findUnique({ where: { workspaceId }, select: { planId: true } });
    if (!s) return null;
    const p = await t.plan.findUnique({ where: { id: s.planId }, select: { creditsMonth: true } });
    return p?.creditsMonth == null ? null : Number(p.creditsMonth);
  }

  /**
   * Sau commit: cờ ngưỡng → listener. Mỗi mốc ghi bằng update có điều kiện (mốc còn trống) → nhiều charge song song chỉ một
   * lần phát `credits.low` / `exhausted` / `restored`. Gọi tay khi resetPlan chạy trong tx người gọi.
   */
  async emit(c: WalletChange): Promise<void> {
    if (!c.applied) return;
    const ws = c.workspaceId;
    const now = this.now();
    const claim = async (where: Record<string, unknown>, data: Record<string, unknown>) =>
      (await this.db.creditWallet.updateMany({ where: { workspaceId: ws, ...where }, data })).count === 1;
    const level = warnLevel(c.after.plan, c.creditsMonth);
    const flags: WalletFlags = { lowAlert: true, warned: null, exhausted: false, restored: false };
    if (level === 95 && (await claim({ warn95SentAt: null }, { warn95SentAt: now }))) {
      await claim({ warn80SentAt: null }, { warn80SentAt: now });
      flags.warned = 95;
    } else if (level === 80 && (await claim({ warn80SentAt: null }, { warn80SentAt: now }))) flags.warned = 80;
    if (c.after.total <= 0) flags.exhausted = await claim({ exhaustedAt: null }, { exhaustedAt: now });
    else flags.restored = await claim({ exhaustedAt: { not: null } }, { exhaustedAt: null });
    if (!flags.warned && !flags.exhausted && !flags.restored) return;
    flags.lowAlert = (await this.db.creditWallet.findUniqueOrThrow({ where: { workspaceId: ws }, select: { lowAlert: true } })).lowAlert;
    await this.listener?.(c, flags);
  }
}
