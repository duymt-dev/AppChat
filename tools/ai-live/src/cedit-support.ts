// Tiện ích chấm ca sửa đơn / hợp đồng TIP-032c (cedit-judge.ts): một lượt Trợ lý thật + xác nhận thẻ theo bộ lọc (móc `before` chạy NGAY
// TRƯỚC khi bấm xác nhận — ghi nền của "người khác"), đọc DTO đơn / hợp đồng qua API, đọc lại tệp XLSX xuất thật (ExcelJS), KPI sales.booked.
import ExcelJS from 'exceljs';
import type { Api } from './runner';
import type { TraceStep } from './safety';

export type Event = { type: string; action_id?: string; confirm_token?: string; text?: string; summary?: string; code?: string; action_log_id?: string };
type Turn = { session_id: string; run_id: string; events: Event[] };
export type Order = { id: string; code: string; owner_user_id: string; owner_name: string; assigned_user_id: string; assigned_name: string; version: number; note: string; total: string; deposit_amount: string; shipping: Record<string, string>; items?: { qty: number | string }[] };
export type Contract = { id: string; code: string; owner_user_id: string; owner_name: string; assigned_user_id: string; assigned_name: string; version: number };

export const INFRA = new Set(['LLM_ERROR', 'LLM_TIMEOUT', 'CREDIT_EXHAUSTED', 'PROVIDER_UNAVAILABLE']);
export const data = <T>(b: unknown) => (b as { data: T }).data;
export const textOf = (events: Event[]) => events.map((x) => (x.type === 'delta' ? (x.text ?? '') : x.type === 'result' ? (x.summary ?? '') : '')).join('');
export const calls = (steps: TraceStep[]) => steps.filter((s) => s.type === 'tool' && s.tool === 'call_action' && s.action_id);
export const CREATOR = 'Người tạo (doanh số)';
export const ASSIGNED = 'Người phụ trách hiện tại';

export async function converse(api: Api, body: Record<string, unknown>, accept: (id: string) => boolean, before?: (id: string) => Promise<void>) {
  const t = await api.req('POST', '/assistant/messages', body);
  if (t.status !== 200) return { error: `turn_http_${t.status}` } as const;
  const turn = data<Turn>(t.body);
  const all = [...turn.events];
  const confirmed: string[] = [];
  const cancelled: string[] = [];
  let pending = turn.events.filter((e) => e.type === 'confirm');
  for (let i = 0; i < 4 && pending.length; i++) {
    const next: Event[] = [];
    for (const e of pending) {
      const ok = !!e.action_id && accept(e.action_id);
      if (ok && before) await before(e.action_id!);
      const r = await api.req('POST', '/assistant/confirm', { confirm_token: e.confirm_token, decision: ok ? 'confirm' : 'cancel' });
      if (ok) confirmed.push(e.action_id!);
      else if (e.action_id) cancelled.push(e.action_id);
      const evs = r.status === 200 ? (data<{ events?: Event[] }>(r.body).events ?? []) : [];
      all.push(...evs);
      next.push(...evs.filter((x) => x.type === 'confirm'));
    }
    pending = next;
  }
  for (const e of pending) {
    await api.req('POST', '/assistant/confirm', { confirm_token: e.confirm_token, decision: 'cancel' });
    if (e.action_id) cancelled.push(e.action_id);
  }
  return { turn, events: all, confirmed, cancelled } as const;
}

export async function traceOf(api: Api, runs: string[]): Promise<TraceStep[] | null> {
  const steps: TraceStep[] = [];
  for (const id of runs) {
    const tr = await api.req('GET', `/assistant/runs/${id}/trace`);
    if (tr.status !== 200) return null;
    steps.push(...data<{ steps: TraceStep[] }>(tr.body).steps);
  }
  return steps;
}

export const orderOf = async (api: Api, id: string) => {
  const r = await api.req('GET', `/orders/${id}`);
  return r.status === 200 ? data<Order>(r.body) : null;
};
export const contractOf = async (api: Api, id: string) => {
  const r = await api.req('GET', `/contracts/${id}`);
  return r.status === 200 ? data<Contract>(r.body) : null;
};

/** Tổng sales.booked cả năm của người gọi (doanh số theo người tạo — TIP-038 / 032c). */
export async function booked(api: Api): Promise<string | null> {
  const y = new Date().getUTCFullYear();
  const r = await api.req('GET', `/insights/sales.booked?from=${y}-01-01&to=${y + 1}-01-01&bucket=month`);
  if (r.status !== 200) return null;
  return String(data<{ rows: { amount: string }[] }>(r.body).rows.reduce((s, x) => s + BigInt(x.amount), 0n));
}

/** Tệp xuất thật: tải `download_url` (đường dẫn /v1/data-jobs/:id/download) → hàng tiêu đề + các dòng; ô công thức = lỗi. */
export async function readXlsx(base: string, auth: Record<string, string>, url: string) {
  const res = await fetch(new URL(url, base).href, { headers: auth });
  if (res.status !== 200) return { error: `download_http_${res.status}` } as const;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await res.arrayBuffer()) as ArrayBuffer);
  const ws = wb.worksheets[0]!;
  const rows: string[][] = [];
  let formula = false;
  ws.eachRow((r, n) => {
    if (n > 2) rows.push((r.values as unknown[]).slice(1).map((v) => String(v ?? '')));
    r.eachCell((c) => void (c.formula && (formula = true)));
  });
  return { head: (ws.getRow(2).values as unknown[]).slice(1).map(String), rows, formula } as const;
}
