// Op `connection.probe` (TIP-012b §4.1 chế độ B, §4.4): thăm dò đọc BỀN của kết nối đã lưu — chạy sau khi kết nối / kết nối lại commit
// (không gọi mạng trong transaction), ghi bằng chứng `last_probe_*` + `probed_rev` cho ĐÚNG phiên bản khoá đã thăm dò (đổi khoá giữa
// chừng → không ghi). Không có khả năng thăm dò đọc → `unsupported` (không bao giờ "xanh" giả). Khác `integration.test` (chế độ A —
// thăm dò nháp, không ghi gì). Không gửi thư / tạo giao dịch.
import { ProviderError, isProviderError, isTenantMail, type BankFeedProvider } from '@appchat/integrations';
import type { CallOpSpec, OpRunArgs } from './call-runner';
import type { TenantTx } from '../../kernel/actions/action-context';
import { upsertCall } from './call-receipt';

export const PROBE_OP = 'connection.probe';

type MailProbeRecord = { state: string; account_ref: string | null; events: boolean; senders: { id: string; email: string; name: string; state: string }[] };
type ProbeRecord = { status: 'verified' | 'failed' | 'unsupported'; reason: string | null; mail?: MailProbeRecord };

async function attempt(a: OpRunArgs): Promise<ProbeRecord> {
  // TIP-012c §1.5: mail của DN — thăm dò KHÔNG gửi, ghi người gửi + trạng thái cho đúng phiên bản khoá (bằng chứng cho campaign.mail_senders).
  if (isTenantMail(a.adapter)) {
    if (!a.mail) throw new ProviderError('provider_unavailable', 'mail');
    try {
      const r = await a.adapter.probe(a.conn, a.mail);
      const ok = r.state === 'sender_verified' || r.state === 'authenticated_transport';
      const mail = { state: r.state, account_ref: r.accountRef, events: r.events, senders: r.senders.map((x) => ({ id: x.id, email: x.email, name: x.name, state: x.state })) };
      return { status: ok ? 'verified' : 'failed', reason: ok ? null : (r.reason ?? r.state), mail };
    } catch (e) {
      if (isProviderError(e) && e.code === 'auth_failed') return { status: 'failed', reason: 'auth_failed', mail: { state: 'degraded', account_ref: null, events: false, senders: [] } };
      throw e;
    }
  }
  const bank = a.adapter as BankFeedProvider | null;
  if (!bank?.probe) return { status: 'unsupported', reason: 'no_probe' };
  try {
    const r = await bank.probe(a.conn, a.http);
    return r.account_found ? { status: 'verified', reason: null } : { status: 'failed', reason: 'account_not_found' };
  } catch (e) {
    if (isProviderError(e) && e.code === 'unsupported') return { status: 'unsupported', reason: e.field === 'api_key' || e.field === 'api_token' ? 'no_read_key' : 'no_probe' };
    if (isProviderError(e) && e.code === 'auth_failed') return { status: 'failed', reason: 'auth_failed' };
    // Lỗi tạm (rate_limited / timeout / provider_unavailable) → để runner thử lại theo lịch.
    throw e;
  }
}

export const probeOp: CallOpSpec = {
  safety: 'read',
  async run(a) {
    const rev = a.call.configRev;
    if (rev === null) throw new ProviderError('unsupported', 'rev');
    const r = await attempt(a);
    const t = a.now();
    await a.db.integrationConnection.updateMany({
      where: { id: a.conn.id, credentialRev: rev, status: { not: 'disconnected' } },
      data: { lastProbeAt: t, lastProbeStatus: r.status, lastProbeReason: r.reason, probedRev: rev, ...(r.mail ? { mailSenders: r.mail } : {}), ...(r.status === 'verified' ? { lastError: null } : {}) },
    });
    return { probe: r.status, ...(r.reason ? { reason: r.reason } : {}) };
  },
};

/**
 * Ghi biên nhận thăm dò bền cho phiên bản khoá vừa lưu (trong transaction kết nối — §4.1 B): chạy sau commit ở worker (job đẩy ngay nếu có
 * producer, không thì quét khôi phục 60 giây nhặt). Một phiên bản khoá một lần thăm dò (ref `rev:<n>`).
 */
export async function queueProbe(tx: Pick<TenantTx, 'integrationCallLog' | 'integrationConnection'>, connectionId: string, requestedBy: string, now: Date) {
  const c = await tx.integrationConnection.findUniqueOrThrow({ where: { id: connectionId }, select: { credentialRev: true } });
  return (await upsertCall(tx, { connectionId, op: PROBE_OP, refId: `rev:${c.credentialRev}`, refType: 'probe', configRev: c.credentialRev, safety: 'read', requestedBy }, now)).row;
}
