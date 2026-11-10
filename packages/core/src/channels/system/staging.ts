// Stage kết quả đăng nhập (TIP-003c §4.5): worker đăng nhập mã hoá credential NGOÀI hiệu ứng rồi đặt vào khoá Redis theo (tài khoản, lần
// đăng nhập) với TTL ngắn; action riêng lấy ra (getdel — dùng một lần) trong transaction. Payload job công khai không khẳng định được
// "đã kết nối"; credential không bao giờ đi qua input / action log.
import type { KeyValueStore } from '../../kernel/redis';
import type { StagedLogin } from './effects';

const TTL_MS = 10 * 60_000;
const key = (accountId: string, attempt: string) => `chlogin:result:${accountId}:${attempt}`;

export const stageLogin = (kv: Pick<KeyValueStore, 'set'>, accountId: string, attempt: string, r: StagedLogin) => kv.set(key(accountId, attempt), JSON.stringify(r), 'PX', TTL_MS);

export async function takeStagedLogin(kv: Pick<KeyValueStore, 'getdel'>, accountId: string, attempt: string): Promise<StagedLogin | null> {
  const v = await kv.getdel(key(accountId, attempt));
  if (!v) return null;
  try {
    return JSON.parse(v) as StagedLogin;
  } catch {
    return null;
  }
}

const downKey = (accountId: string, generation: number) => `chdown:detail:${accountId}:${generation}`;

/** Mã lỗi an toàn (≤ 120 ký tự) của lần hạ tài khoản — đọc một lần khi ghi health. */
export const stageDownDetail = (kv: Pick<KeyValueStore, 'set'>, accountId: string, generation: number, detail: string) => kv.set(downKey(accountId, generation), detail.slice(0, 120), 'PX', TTL_MS);
export const takeDownDetail = async (kv: Pick<KeyValueStore, 'getdel'>, accountId: string, generation: number) => (await kv.getdel(downKey(accountId, generation))) ?? undefined;
