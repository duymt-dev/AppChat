// Thế hệ phiên tài khoản kênh (TIP-014b C) — fence chủ phiên cũ. `channel_account.session_generation` tăng khi worker giành phiên và khi
// trạng thái đổi (tạm dừng / ngắt / kết nối lại / hết hạn). Worker giữ thế hệ lúc giành; mọi đặt chỗ gọi kênh (phần gửi, lệnh thao tác)
// kiểm lại thế hệ dưới khoá dòng trong cùng transaction đặt chỗ → chủ cũ (mất lease, đã bị tạm dừng) không đặt chỗ được nữa. Lệnh đã gọi
// kênh trước khi bị fence thì không huỷ được phía nhà cung cấp — vẫn theo luật `unknown`, không thu hồi "thần kỳ".
import type { TenantTx } from '../../kernel/actions/action-context';

type Raw = Pick<TenantTx, '$queryRaw'>;

/** Đặt chỗ bị từ chối vì thế hệ phiên đã đổi — chưa gọi kênh (an toàn để chủ phiên mới chạy lại). */
export class StaleGenerationError extends Error {
  constructor(
    readonly accountId: string,
    readonly held: number,
  ) {
    super(`stale_session_generation:${held}`);
    this.name = 'StaleGenerationError';
  }
}

/** Worker vừa giành lease → thế hệ mới (nguyên tử). null = tài khoản không còn. */
export async function claimGeneration(db: Raw, accountId: string): Promise<number | null> {
  const r = await db.$queryRaw<{ g: number }[]>`
    UPDATE channel_account SET session_generation = session_generation + 1 WHERE id = ${accountId}::uuid RETURNING session_generation AS g`;
  return r[0]?.g ?? null;
}

/**
 * Chủ phiên nhả phiên (mất lease / tắt / dừng): chỉ tăng khi DB còn đúng thế hệ của mình — chủ mới đã giành (thế hệ lớn hơn) thì không
 * đụng. Trả true khi đã fence.
 */
export async function fenceGeneration(db: Raw, accountId: string, held: number): Promise<boolean> {
  const r = await db.$queryRaw<{ g: number }[]>`
    UPDATE channel_account SET session_generation = session_generation + 1
    WHERE id = ${accountId}::uuid AND session_generation = ${held} RETURNING session_generation AS g`;
  return r.length > 0;
}

/** Đổi trạng thái tài khoản (tạm dừng / ngắt / kết nối lại / hết hạn) → fence mọi chủ phiên hiện tại. */
export async function bumpGeneration(db: Raw, accountId: string): Promise<void> {
  await db.$queryRaw`UPDATE channel_account SET session_generation = session_generation + 1 WHERE id = ${accountId}::uuid RETURNING id`;
}

/** Trong transaction đặt chỗ: khoá dòng tài khoản (FOR SHARE) + so thế hệ. `held` vắng (kênh không lease) → bỏ qua. */
export async function assertGeneration(tx: Raw, accountId: string, held: number | undefined): Promise<void> {
  if (held === undefined) return;
  const r = await tx.$queryRaw<{ g: number }[]>`SELECT session_generation AS g FROM channel_account WHERE id = ${accountId}::uuid FOR SHARE`;
  if (r[0]?.g !== held) throw new StaleGenerationError(accountId, held);
}

/** Thế hệ hiện tại (nhịp lease so với thế hệ đang giữ — lệch = trạng thái đã đổi mà lệnh pub/sub bị lỡ). */
export async function currentGeneration(db: Raw, accountId: string): Promise<number | null> {
  const r = await db.$queryRaw<{ g: number }[]>`SELECT session_generation AS g FROM channel_account WHERE id = ${accountId}::uuid`;
  return r[0]?.g ?? null;
}
