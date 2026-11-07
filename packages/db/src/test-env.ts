// DB nền tảng RIÊNG cho test (DC-358): integration, E2E http, ai:live dùng `appchat_platform_test` thay DB nền tảng của demo / dev.
// Trước đây test ghi workspace vào cùng DB nền tảng với demo → worker demo quét cả DB tenant của test, cạn `max_connections`.
// DB tenant `ws_*` vẫn chung cụm (tên theo uuid, không trùng), clone từ cùng template. Reset: `pnpm --filter @appchat/db db:test-reset`.
// Tự chứa (không import) — tools/scripts/*.mjs import thẳng file .ts này (Node 24 bỏ kiểu).

export const TEST_PLATFORM_DB_DEFAULT = 'appchat_platform_test';

const dbOf = (url: string) => decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
const swap = (url: string, db: string) => {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
};

/**
 * Env đã đổi sang DB nền tảng test: `PLATFORM_DATABASE_URL` + `MIGRATOR_DATABASE_URL` (migrator trỏ DB nền tảng). Tên DB lấy
 * `TEST_PLATFORM_DB` hoặc mặc định. Chốt chặn: tên test trùng DB nền tảng gốc → ném lỗi, không bao giờ chạy test trên DB demo.
 */
export function testDbEnv(base: Record<string, string | undefined>): Record<string, string> {
  const platformUrl = base.PLATFORM_DATABASE_URL;
  if (!platformUrl) throw new Error('Thiếu PLATFORM_DATABASE_URL — chạy `pnpm --filter @appchat/db db:setup` trước');
  const name = base.TEST_PLATFORM_DB || TEST_PLATFORM_DB_DEFAULT;
  if (name === dbOf(platformUrl)) throw new Error(`TEST_PLATFORM_DB (${name}) trùng DB nền tảng của demo — test phải dùng DB riêng`);
  const out: Record<string, string> = { PLATFORM_DATABASE_URL: swap(platformUrl, name), TEST_PLATFORM_DB: name };
  if (base.MIGRATOR_DATABASE_URL) out.MIGRATOR_DATABASE_URL = swap(base.MIGRATOR_DATABASE_URL, name);
  return out;
}
