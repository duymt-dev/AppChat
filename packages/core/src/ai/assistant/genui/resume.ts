// Tiếp tục lượt Trợ lý sau kết quả bên ngoài (TIP-023c hợp đồng 2): trình duyệt chỉ báo "tài khoản Y, lần X, node N đã xong"; SERVER
// tự đọc trạng thái hiện hành (channel.status) — chưa `connected` / sai attempt / run không phải của người gọi / run đã kết thúc → không
// tiếp tục. Biên nhận unique (run, node, attempt): poll / WS / reload trùng chỉ tiếp tục MỘT lần. Kết quả an toàn (không QR / credential)
// mới vào run làm input cho bước tiếp theo.
import type { TenantDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ChannelControl } from '../../../channels/services/control';
import { channelStatusOf } from '../../../channels/services/login-attempt';
import { uuidv7 } from '../../../kernel/ids';

type Db = Pick<TenantDb, 'aiRun' | 'assistantReceipt' | 'channelAccount' | 'assistantRequest'>;

export interface ResumeClaim {
  runId: string;
  node: string;
  channelAccountId: string;
  attempt: string;
  userId: string;
}

export type VerifiedResult = { verified: true; receiptId: string; result: { channel_account_id: string; status: 'connected'; name: string } } | { verified: false; status: string };

/**
 * Kiểm + ghi biên nhận. Trả `verified:true` đúng MỘT lần cho (run, node, attempt); lần sau → `verified:false, status:'duplicate'`.
 * Lỗi quyền / run lạ → 404 (không lộ run của người khác).
 */
export async function verifyExternal(db: Db, control: Pick<ChannelControl, 'login'> | null, q: ResumeClaim, now: Date): Promise<VerifiedResult> {
  const run = await db.aiRun.findUnique({ where: { id: q.runId }, select: { kind: true, initiatedByUserId: true, status: true } });
  if (!run || run.kind !== 'assistant' || run.initiatedByUserId !== q.userId) throw new AppError('NOT_FOUND', 404, { run_id: 'not_found' });
  if (['completed', 'failed', 'cancelled', 'handoff'].includes(run.status)) return { verified: false, status: run.status };
  const req = await db.assistantRequest.findUnique({ where: { runId: q.runId }, select: { executionState: true } });
  if (req && ['cancelled', 'failed', 'succeeded'].includes(req.executionState)) return { verified: false, status: req.executionState };
  const st = await channelStatusOf(db, control, q.channelAccountId);
  // Chỉ tin trạng thái server: lần hiện hành phải đúng attempt người dùng thấy, và đã connected.
  if (st.login?.attempt && st.login.attempt !== q.attempt) return { verified: false, status: 'stale_attempt' };
  if (st.account_status !== 'connected') return { verified: false, status: st.login?.status ?? st.account_status };
  const result = { channel_account_id: st.channel_account_id, status: 'connected' as const, name: st.name };
  const key = { runId: q.runId, node: q.node.slice(0, 40), attempt: q.attempt.slice(0, 80) };
  // Đã tiếp tục ở lần gọi trước → duplicate. Trong transaction không được để INSERT trùng nổ (Postgres huỷ cả transaction), nên đọc trước;
  // hai lần gọi song song thì unique (run, node, attempt) chặn bên thua — bên đó nhận 409 từ executor, không tiếp tục lần hai.
  if (await db.assistantReceipt.findUnique({ where: { runId_node_attempt: key }, select: { id: true } })) return { verified: false, status: 'duplicate' };
  const id = uuidv7(now.getTime());
  await db.assistantReceipt.create({ data: { id, ...key, kind: 'channel.connected', result, createdAt: now } });
  return { verified: true, receiptId: id, result };
}
