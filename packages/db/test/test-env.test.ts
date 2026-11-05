// DB nền tảng riêng của test (DC-358): đổi đúng tên DB trong URL nền tảng + migrator, giữ user / host / mật khẩu; không bao giờ trỏ DB demo.
import { describe, expect, it } from 'vitest';
import { TEST_PLATFORM_DB_DEFAULT, testDbEnv } from '../src/test-env';

const base = {
  PLATFORM_DATABASE_URL: 'postgresql://appchat_platform_app:pw@localhost:5432/appchat_platform',
  MIGRATOR_DATABASE_URL: 'postgresql://appchat_migrator:pw2@localhost:5432/appchat_platform?sslmode=disable',
  TENANT_DATABASE_URL: 'postgresql://appchat_tenant_app:pw3@localhost:5432/postgres',
};

describe('testDbEnv', () => {
  it('đổi DB nền tảng + migrator sang DB test mặc định, giữ role / mật khẩu / query; không đụng URL tenant', () => {
    const t = testDbEnv(base);
    expect(t.PLATFORM_DATABASE_URL).toBe(`postgresql://appchat_platform_app:pw@localhost:5432/${TEST_PLATFORM_DB_DEFAULT}`);
    expect(t.MIGRATOR_DATABASE_URL).toBe(`postgresql://appchat_migrator:pw2@localhost:5432/${TEST_PLATFORM_DB_DEFAULT}?sslmode=disable`);
    expect(t.TEST_PLATFORM_DB).toBe(TEST_PLATFORM_DB_DEFAULT);
    expect(t).not.toHaveProperty('TENANT_DATABASE_URL');
  });

  it('TEST_PLATFORM_DB đặt tên khác; thiếu migrator thì không sinh', () => {
    const t = testDbEnv({ PLATFORM_DATABASE_URL: base.PLATFORM_DATABASE_URL, TEST_PLATFORM_DB: 'appchat_platform_ci' });
    expect(t.PLATFORM_DATABASE_URL).toMatch(/\/appchat_platform_ci$/);
    expect(t).not.toHaveProperty('MIGRATOR_DATABASE_URL');
  });

  it('tên test trùng DB nền tảng demo → ném lỗi; thiếu URL nền tảng → ném lỗi', () => {
    expect(() => testDbEnv({ ...base, TEST_PLATFORM_DB: 'appchat_platform' })).toThrow(/trùng DB nền tảng/);
    expect(() => testDbEnv({})).toThrow(/PLATFORM_DATABASE_URL/);
  });
});
