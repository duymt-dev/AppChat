// Số liệu phụ của trang Hợp đồng từ dữ liệu thật: KPI (tổng / đã ký / chờ ký / giá trị đang hiệu lực), chip, kết quả mẫu của panel
// Trợ lý AI · Hợp đồng (luật trên dữ liệu, không gọi LLM — chữ server i18n); theo từng hợp đồng (`?contract_id=`): thẻ CRM của khách
// (LTV, số hợp đồng, hạng, các hợp đồng khác), nhận định + gợi ý, tệp (PDF đã ký / bản nội dung).
import { contractChipOf, createFmt, interpolate, serverMessages, type AuthzContext, type ContractStatusKey } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { ContractRecord } from '../contract-access';
import { contractCounts, endingSoon } from '../repos/contracts.repo';

const DAY = 86_400_000;
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '0%');
const kb = (n: bigint) => `${Math.max(1, Math.round(Number(n) / 1024))} KB`;

export async function contractKpis(tx: TenantTx, authz: AuthzContext) {
  const rows = await contractCounts(tx, authz);
  const by = Object.fromEntries(rows.map((r) => [r.status, r])) as Record<string, { n: number; value: bigint }>;
  const counts: Record<string, number> = { all: rows.reduce((a, r) => a + r.n, 0) };
  for (const r of rows) {
    const chip = contractChipOf(r.status as ContractStatusKey);
    counts[chip] = (counts[chip] ?? 0) + r.n;
  }
  return {
    counts,
    stats: { total: counts.all!, signed: counts.signed ?? 0, pending: counts.pending ?? 0, active_value: String(by.signed?.value ?? 0n) },
    by,
  };
}

export async function contractRuns(tx: TenantTx, authz: AuthzContext, k: Awaited<ReturnType<typeof contractKpis>>, o: { locale: string; timeZone: string; now: Date }) {
  const m = serverMessages(o.locale).sales.contract.runs;
  const fmt = createFmt(o);
  const n = (s: string) => k.by[s]?.n ?? 0;
  const late = await tx.contract.count({ where: { status: 'pending_signature', deletedAt: null, sentAt: { lt: new Date(o.now.getTime() - DAY) } } });
  const ending = await endingSoon(tx, authz, o.now, new Date(o.now.getTime() + 30 * DAY), 3);
  const sentDone = n('signed') + n('expired') + n('terminated') + n('declined');
  return {
    risk: interpolate(m.risk, { pending: n('pending_signature'), late: late ? interpolate(m.riskLate, { late }) : '', ending: ending.length, expired: n('expired') }),
    draft: m.draft,
    renew: ending.length ? interpolate(m.renew, { count: ending.length, list: `: ${ending.map((e) => `${e.code} · ${e.name}`).join(', ')}` }) : m.renewEmpty,
    analyze: sentDone ? interpolate(m.analyze, { active: fmt.moneyShort(String(k.by.signed?.value ?? 0n)), rate: pct(n('signed') + n('expired') + n('terminated'), sentDone), signed: n('signed') + n('expired') + n('terminated'), done: sentDone }) : m.analyzeEmpty,
  };
}

/** Thẻ CRM / nhận định / gợi ý / tệp của MỘT hợp đồng (drawer). */
export async function contractInsights(tx: TenantTx, c: ContractRecord, o: { locale: string; timeZone: string; now: Date }, names: Map<string, string>) {
  const m = serverMessages(o.locale).sales.contract;
  const fmt = createFmt(o);
  const [contact, others] = await Promise.all([
    tx.contact.findUnique({ where: { id: c.contactId }, select: { name: true, totalSpent: true, tierKey: true } }),
    tx.contract.findMany({ where: { contactId: c.contactId, deletedAt: null }, orderBy: { createdAt: 'desc' }, select: { id: true, code: true, title: true, value: true } }),
  ]);
  const total = others.reduce((a, x) => a + x.value, 0n);
  const left = c.endDate && c.status === 'signed' ? Math.ceil((c.endDate.getTime() - o.now.getTime()) / DAY) : null;
  const insight = interpolate(m.insight, { name: contact?.name ?? '', count: others.length, total: fmt.moneyShort(String(total)) }) + (left !== null && left <= 60 ? interpolate(m.insightEnding, { n: Math.max(0, left) }) : '');
  const suggestions = c.status === 'signed' ? [m.suggest.renew, m.suggest.order] : c.status === 'pending_signature' ? [m.suggest.remind] : [m.suggest.survey];
  const fileIds = [c.signedFileId, c.fileId].filter((x): x is string => !!x);
  const files = fileIds.length ? await tx.file.findMany({ where: { id: { in: fileIds } }, select: { name: true, size: true, uploadedBy: true, createdAt: true } }) : [];
  return {
    crm: {
      ltv: String(contact?.totalSpent ?? 0n),
      total: others.length,
      tier: contact?.tierKey ?? '',
      debt: '0',
      others: others.filter((x) => x.id !== c.id).slice(0, 5).map((x) => ({ code: x.code, title: x.title, value: String(x.value) })),
    },
    insight,
    suggestions,
    files: files.map((f) => ({ name: f.name, ext: 'pdf', by: (f.uploadedBy && names.get(f.uploadedBy)) || 'esign', at: f.createdAt.toISOString().slice(0, 10), size: kb(f.size) })),
  };
}
