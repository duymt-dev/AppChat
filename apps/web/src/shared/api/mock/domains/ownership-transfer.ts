// Mock đổi Chủ sở hữu (TIP-045b annex A3) cùng luật server: chỉ Owner; người nhận là thành viên active khác; mã gắn người nhận (mock: mã cố
// định MOCK_TRANSFER_OTP), sai 5 lần / xin mã mới thì mã cũ chết; đúng mã → người nhận owner, Owner cũ manager; mock role đổi theo.
import { ApiRequestError } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockDb } from '../store';

export const MOCK_TRANSFER_OTP = '246810';
const MAX_FAILS = 5;
let pending: { to: string; fails: number } | null = null;

const otpErr = (otp: string) => new ApiRequestError(422, { code: 'OTP_INVALID', message: otp, fields: { otp } });

function target(db: MockDb, id: string) {
  if (db.role !== 'owner') throw new ApiRequestError(403, { code: 'FORBIDDEN', message: 'workspace.transfer_ownership', fields: { owner: 'not_owner' } });
  const m = db.settings.members.find((x) => x.id === id && !x.invite && x.status !== 'pending');
  if (!m) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id, fields: { to_user_id: 'not_member' } });
  if (m.role === 'owner') throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'self', fields: { to_user_id: 'self' } });
  return m;
}

export const ownershipTransferHandlers: Record<string, MockHandler> = {
  'workspace.request_transfer_otp': {
    execute: (db, i: { to_user_id: string }) => {
      target(db, i.to_user_id);
      pending = { to: i.to_user_id, fails: 0 };
      return { sent_to: 'ow•••@annhien.vn', expires_at: new Date(Date.now() + 10 * 60_000).toISOString() };
    },
  },
  'workspace.transfer_ownership': {
    execute: (db, i: { to_user_id: string; otp: string }) => {
      const m = target(db, i.to_user_id);
      if (!pending || pending.fails >= MAX_FAILS) throw otpErr('expired');
      if (pending.to !== i.to_user_id) throw otpErr('stale');
      if (i.otp !== MOCK_TRANSFER_OTP) {
        pending.fails++;
        throw otpErr('invalid');
      }
      pending = null;
      for (const x of db.settings.members) if (x.role === 'owner') x.role = 'manager';
      m.role = 'owner';
      db.role = 'manager';
      return { owner_user_id: m.id, previous_owner_role: 'manager' };
    },
  },
};

/** Test: bỏ mã đang chờ. */
export const resetTransferMock = () => void (pending = null);
