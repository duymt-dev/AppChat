// Mock vùng nguy hiểm Owner (TIP-041 P3) cùng luật server: chỉ Owner; xoá = gõ đúng tên → mã (mock cố định MOCK_DELETE_OTP, hạn 5 phút, sai
// 5 lần khoá, xin mã mới thì mã cũ chết) → `workspace.delete` đưa phiên sang `deleting`. Yêu cầu đóng băng: một yêu cầu chờ mỗi workspace;
// admin duyệt → tạm dừng (workspace mock của /admin), từ chối → không đổi. Trạng thái mô-đun (như ownership-transfer).
import { ApiRequestError, type FreezeRequestRowDto, type WorkspaceDeletePreviewDto } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';

export const MOCK_DELETE_OTP = '135790';
const MAX_FAILS = 5;
const CHALLENGE_ID = '0190f000-0000-7000-8000-00000000d041';
let challenge: { fails: number; expires: number } | null = null;
let freeze: FreezeRequestRowDto[] = [];

const otpErr = (otp: string) => new ApiRequestError(422, { code: 'OTP_INVALID', message: otp, fields: { otp } });
const owner = (db: MockDb) => {
  if (db.role !== 'owner') throw new ApiRequestError(403, { code: 'FORBIDDEN', message: 'owner', fields: { owner: 'not_owner' } });
};
const wsId = (db: MockDb) => db.shell.me.current_workspace_id ?? 'mock-ws';
const now = () => new Date().toISOString();

export const deletePreviewOf = (db: MockDb): WorkspaceDeletePreviewDto => ({
  workspace_id: wsId(db),
  name: db.settings.workspace.name,
  db_status: 'active',
  status_version: 0,
  members: db.settings.members.filter((m) => !m.invite && m.status !== 'pending').length,
  paid_days_left: 18,
  plan_name: 'Team',
  topup_credits: 1200,
  backup_retention_days: 30,
  retained: ['billing_invoices', 'wallet_ledger', 'audit_log'],
});

/** Yêu cầu đóng băng mới nhất của workspace hiện tại (GET /workspace/lifecycle — chỉ Owner). */
export const latestFreeze = (db: MockDb) => {
  if (db.role !== 'owner') return null;
  const r = freeze.find((x) => x.workspace_id === wsId(db));
  return r ? { id: r.id, status: r.status, created_at: r.created_at, decided_at: r.decided_at } : null;
};

export const workspaceDangerRoutes: Record<string, MockRoute> = {
  '/workspace/delete-preview': (db) => (owner(db), deletePreviewOf(db)),
  '/admin/freeze-requests': (_db, p) => ({ data: freeze.filter((r) => r.status === ((p.status as string) || 'pending')), next_cursor: null }),
};

export const workspaceDangerHandlers: Record<string, MockHandler> = {
  'workspace.delete_challenge': {
    execute: (db, i: { confirm_name: string }) => {
      owner(db);
      if (i.confirm_name.trim().toLocaleLowerCase('vi') !== db.settings.workspace.name.trim().toLocaleLowerCase('vi'))
        throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'mismatch', fields: { confirm_name: 'mismatch' } });
      challenge = { fails: 0, expires: Date.now() + 5 * 60_000 };
      return { challenge_id: CHALLENGE_ID, sent_to: 'ow•••@annhien.vn', expires_at: new Date(challenge.expires).toISOString(), preview_hash: 'mock' };
    },
  },
  'workspace.delete': {
    execute: (db, i: { challenge_id: string; otp: string }) => {
      owner(db);
      if (!challenge || i.challenge_id !== CHALLENGE_ID || challenge.expires <= Date.now()) throw otpErr('expired');
      if (challenge.fails >= MAX_FAILS) throw otpErr('locked');
      if (i.otp !== MOCK_DELETE_OTP) {
        challenge.fails++;
        throw otpErr('invalid');
      }
      challenge = null;
      db.session.lifecycle = 'deleting';
      return { workspace_id: wsId(db), job_id: '0190f000-0000-7000-8000-00000000d042', db_status: 'deleting', backup_expires_on: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10) };
    },
  },
  'workspace.freeze_request': {
    execute: (db, i: { reason: string }) => {
      owner(db);
      if (freeze.some((r) => r.workspace_id === wsId(db) && r.status === 'pending'))
        throw new ApiRequestError(409, { code: 'CONFLICT', message: 'pending', fields: { freeze_request: 'pending_exists' } });
      const id = `0190f000-0000-7000-8000-${String(0xf000 + freeze.length).padStart(12, '0')}`;
      freeze = [{ id, workspace_id: wsId(db), workspace_name: db.settings.workspace.name, requested_by: 'u_owner', reason: i.reason, status: 'pending', version: 1, decision_reason: null, created_at: now(), decided_at: null }, ...freeze];
      return { request_id: id, status: 'pending' };
    },
  },
  'admin.workspace.freeze_decide': {
    execute: (db, i: { request_id: string; if_version: number; decision: 'approve' | 'reject'; reason: string }) => {
      const r = freeze.find((x) => x.id === i.request_id);
      if (!r) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: i.request_id, fields: { request_id: 'not_found' } });
      if (r.version !== i.if_version) throw new ApiRequestError(409, { code: 'CONFLICT', message: 'stale', fields: { if_version: 'stale', current_version: String(r.version) } });
      if (r.status !== 'pending') throw new ApiRequestError(409, { code: 'INVALID_TRANSITION', message: r.status, fields: { status: r.status } });
      const status = i.decision === 'approve' ? 'approved' : 'rejected';
      Object.assign(r, { status, version: r.version + 1, decision_reason: i.reason, decided_at: now() });
      if (status === 'approved') {
        const w = db.platformAdmin.workspaces[0];
        if (w) Object.assign(w, { status: 'suspended', db_status: 'suspended', suspend_reason: `freeze_request: ${i.reason}`, version: w.version + 1 });
      }
      return { request_id: r.id, status, version: r.version };
    },
  },
};

/** Test: bỏ mã + yêu cầu đang giữ. */
export const resetDangerMock = () => {
  challenge = null;
  freeze = [];
};
