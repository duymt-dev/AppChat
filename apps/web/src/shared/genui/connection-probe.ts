// "Kiểm tra kết nối" trong form GenUI (TIP-023c G3 mục 10): form gắn action kết nối → action thăm dò tương ứng (risk read, không lưu
// gì): email → `channel.test` (form nháp IMAP / SMTP), connector / bank feed → `integration.test` (probe connector, DEF-012-1).
// Bảng tĩnh phía client — model không chọn được action thăm dò hay đích gọi.
type Input = Record<string, unknown>;
const rec = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, string>) : {});

export interface ConnectionProbe {
  action: 'channel.test' | 'integration.test';
  input(form: Input): Input;
}

const CONNECTOR: ConnectionProbe = { action: 'integration.test', input: (f) => ({ provider: f.provider, fields: rec(f.fields) }) };

export const CONNECTION_PROBES: Record<string, ConnectionProbe> = {
  'channel.email.connect': { action: 'channel.test', input: (f) => ({ type: 'email', fields: { ...rec(f.fields), ...(f.address ? { address: String(f.address) } : {}) } }) },
  'integration.connect': CONNECTOR,
  'bank_feed.connect': CONNECTOR,
};

export type ProbeOutcome = { ok: boolean; message?: string; reason?: string };

/** Chuẩn hoá hai khuôn output (`channel.test` {ok,message} · `integration.test` {status,reason}). */
export function probeOutcome(r: unknown): ProbeOutcome {
  const o = (r ?? {}) as { ok?: boolean; message?: string; status?: string; reason?: string };
  if (typeof o.ok === 'boolean') return { ok: o.ok, ...(o.message ? { message: o.message } : {}) };
  return { ok: o.status === 'ok', ...(o.status && o.status !== 'ok' ? { reason: o.reason ? `${o.status}.${o.reason}` : o.status } : {}) };
}
