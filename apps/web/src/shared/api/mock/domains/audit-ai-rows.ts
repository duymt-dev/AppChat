// Dòng AI audit (TIP-045b A2) tách thành module lá (TIP-020d): `run-detail` dựng run từ đây mà không kéo `routes` (tránh vòng phụ thuộc).
import type { AiAuditRowDto } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/settings.json';

const DAY = '2026-10-30';
const at = (hm: string) => new Date(`${DAY}T${hm.length === 5 ? `${hm}:00` : hm}+07:00`).toISOString();
const id = (p: string, i: number) => `0190f000-0000-7000-8000-${p}${String(i).padStart(10, '0')}`;

/** Dòng AI audit = run (TIP-020d: bấm dòng mở chi tiết run — mock `run-detail` dựng run từ đây). */
export const aiAuditRows: AiAuditRowDto[] = fixture.ai_audit.map((l, i) => ({
  id: id('cc', i),
  time: at(l.time),
  actor: l.actor,
  agent_name: null,
  action: l.action,
  context: l.context,
  tier: 'standard',
  credits: 0,
  tokens: 0,
  status: l.status as AiAuditRowDto['status'],
  trace_id: null,
}));
