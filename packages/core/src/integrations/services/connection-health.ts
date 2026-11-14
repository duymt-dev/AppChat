// Sức khoẻ kết nối từ BẰNG CHỨNG (TIP-012b §1.3): "đã lưu khoá" ≠ "đã xác minh". verified chỉ khi thăm dò / kéo thành công cho đúng
// phiên bản khoá hiện tại; lỗi gần nhất → degraded; thăm dò không hỗ trợ → configured_unverified (không bao giờ xanh giả); sandbox
// luôn hiện riêng (giả lập, không phải provider thật).
import type { ConnectionHealth } from '@appchat/shared';
import { adapterFor, type BankFeedProvider, type ConnectorEntry, type ConnectionMode } from '@appchat/integrations';

export interface HealthRow {
  mode: ConnectionMode;
  status: 'connected' | 'error' | 'disconnected';
  credentialRev: number;
  probedRev: number | null;
  lastProbeStatus: string | null;
  lastError: string | null;
}

export function healthOf(r: HealthRow, pendingProbe = false): ConnectionHealth {
  if (r.status === 'disconnected') return 'disconnected';
  if (r.mode === 'sandbox') return 'sandbox';
  if (r.status === 'error' || r.lastError) return 'degraded';
  const current = r.probedRev === r.credentialRev;
  if (current && r.lastProbeStatus === 'verified') return 'verified';
  if (current && r.lastProbeStatus === 'failed') return 'degraded';
  if (pendingProbe) return 'probing';
  return 'configured_unverified';
}

/** Khả năng THẬT của adapter đúng chế độ (không suy từ manifest) — thiếu adapter → tất cả false. */
export function capabilitiesOf(e: ConnectorEntry | undefined, mode: ConnectionMode) {
  const a = adapterFor<BankFeedProvider>(e, mode);
  return { webhook: !!a?.verifyWebhook, probe: !!a?.probe, pull: !!a?.pull };
}

/** ••3456 — đủ để nhận ra tài khoản, không lộ số đầy đủ cho người chỉ có quyền integrations. */
export const maskAccount = (acc: string) => (acc ? `••${acc.slice(-4)}` : '');
