// Đối soát ví credit (TIP-045b annex E), hai phép:
// 1. Sổ ↔ ví: tổng `delta` của `credit_ledger` = số dư ví (plan + topup) — mọi thay đổi ví ghi một dòng sổ cùng transaction, nên tổng
//    không phụ thuộc thứ tự dòng. Đọc cả hai trong MỘT câu lệnh (một snapshot) — không so hai ảnh chụp đang đổi như thể nguyên tử.
// 2. Trừ tiền AI ↔ biên nhận tenant: mỗi dòng sổ `ai_step` (ref `<run>:<bước llm>`) trong cửa sổ trước mốc cắt phải có `ai_run_step`
//    ghi cùng số credit (nền tảng trừ trước, tenant ghi sau — Blueprint §2.0). Thiếu biên nhận gần mốc (< SETTLE) = đang ghi → `pending`.
// Chỉ phát hiện — không bao giờ sửa ví / sổ / bước.
import type { PlatformDb, TenantDb } from '@appchat/db';
import type { Finding, ReconcileInput } from './reconcile-types';

/** Cửa sổ trừ tiền AI xét mỗi lượt (lượt hằng giờ → xét 2 giờ để chồng mép); dòng mới hơn SETTLE trước mốc coi là chưa chốt. */
export const USAGE_WINDOW_MS = 2 * 3_600_000;
export const SETTLE_MS = 5 * 60_000;
/** Trần số dòng sổ xét mỗi workspace mỗi lượt (giới hạn bộ nhớ); vượt → ghi finding pending để lượt sau / người xử lý biết. */
export const USAGE_SCAN_LIMIT = 5_000;
// TIP-019b: lượt quyết toán thêm của cùng bước ghi ref `<run>:<bước>:s<n>` — gộp theo bước (bước llm ghi tổng của nhóm).
const RUN_REF = /^([0-9a-f-]{36}):(\d+)(?::s\d+)?$/;

type Platform = Pick<PlatformDb, '$queryRaw' | 'creditLedger'>;
type Tenant = Pick<TenantDb, '$queryRaw'>;

export async function checkWalletLedger(platform: Platform, r: ReconcileInput): Promise<Finding[]> {
  const [row] = await platform.$queryRaw<{ wallet: bigint | null; ledger: bigint | null }[]>`
    SELECT (SELECT plan_balance + topup_balance FROM credit_wallet WHERE workspace_id = ${r.workspaceId}::uuid) AS wallet,
           (SELECT coalesce(sum(delta), 0) FROM credit_ledger WHERE workspace_id = ${r.workspaceId}::uuid) AS ledger`;
  const wallet = BigInt(row?.wallet ?? 0n);
  const ledger = BigInt(row?.ledger ?? 0n);
  if (wallet === ledger) return [];
  return [{ check: 'wallet_ledger', reference: 'wallet', severity: 'mismatch', detail: { wallet: wallet.toString(), ledger: ledger.toString() } }];
}

export async function checkUsageReceipts(platform: Platform, tenant: Tenant, r: ReconcileInput): Promise<Finding[]> {
  const from = new Date(r.cutoff.getTime() - USAGE_WINDOW_MS);
  const charges = await platform.creditLedger.findMany({
    where: { workspaceId: r.workspaceId, refType: 'ai_step', createdAt: { gt: from, lte: r.cutoff } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: USAGE_SCAN_LIMIT + 1,
    select: { refId: true, delta: true, createdAt: true },
  });
  const out: Finding[] = [];
  if (charges.length > USAGE_SCAN_LIMIT) {
    out.push({ check: 'wallet_usage', reference: 'scan_limit', severity: 'pending', detail: { limit: USAGE_SCAN_LIMIT } });
    charges.length = USAGE_SCAN_LIMIT;
  }
  const byStep = new Map<string, { ref: string; run: string; step: number; credits: number; at: Date }>();
  for (const c of charges) {
    const m = RUN_REF.exec(c.refId);
    if (!m) continue;
    const ref = `${m[1]}:${m[2]}`;
    const cur = byStep.get(ref);
    if (cur) {
      cur.credits += -Number(c.delta);
      if (c.createdAt > cur.at) cur.at = c.createdAt;
    } else byStep.set(ref, { ref, run: m[1]!, step: Number(m[2]), credits: -Number(c.delta), at: c.createdAt });
  }
  const parsed = [...byStep.values()];
  if (!parsed.length) return out;
  const runs = [...new Set(parsed.map((p) => p.run))];
  // Bước llm ghi `meta.llm_step` = chỉ số bước của engine (khớp ref sổ); `idx` là thứ tự trong run.
  const steps = await tenant.$queryRaw<{ run_id: string; llm_step: number; credits: number }[]>`
    SELECT run_id::text AS run_id, (meta ->> 'llm_step')::int AS llm_step, credits
    FROM ai_run_step WHERE run_id = ANY(${runs}::uuid[]) AND type = 'llm' AND meta ? 'llm_step'`;
  const got = new Map(steps.map((s) => [`${s.run_id}:${s.llm_step}`, Number(s.credits)]));
  const settled = r.cutoff.getTime() - SETTLE_MS;
  for (const p of parsed) {
    const recorded = got.get(p.ref);
    if (recorded === p.credits) continue;
    const severity = recorded === undefined && p.at.getTime() > settled ? 'pending' : 'mismatch';
    out.push({ check: 'wallet_usage', reference: `run:${p.ref}`, severity, detail: { charged: p.credits, recorded: recorded ?? null } });
  }
  return out;
}
