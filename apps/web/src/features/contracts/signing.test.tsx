// TIP-030c §1.2, §5.1: danh tính yêu cầu ký — lỗi mạng (chưa rõ) giữ request_id (gửi lại = cùng yêu cầu), kết quả dứt khoát (thành công /
// lỗi nghiệp vụ) hoặc nội dung đổi → id mới. Không ghi gì vào localStorage.
import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '@appchat/shared';
import { requestIds } from './signing-api';

describe('requestIds', () => {
  it('lỗi mạng giữ id; thành công → id mới; lỗi nghiệp vụ → id mới; đổi nội dung → id mới', async () => {
    const run = requestIds();
    const seen: string[] = [];
    await run('sign', 'a', async (id) => {
      seen.push(id);
      throw new TypeError('network');
    }).catch(() => undefined);
    await run('sign', 'a', async (id) => void seen.push(id));
    expect(seen[0]).toBe(seen[1]);
    await run('sign', 'a', async (id) => void seen.push(id));
    expect(seen[2]).not.toBe(seen[1]);
    await run('sign', 'a', async (id) => {
      seen.push(id);
      throw new ApiRequestError(422, { code: 'OTP_INVALID', message: '4' });
    }).catch(() => undefined);
    await run('sign', 'a', async (id) => void seen.push(id));
    expect(seen[4]).not.toBe(seen[3]);
    await run('sign', 'b', async (id) => {
      seen.push(id);
      throw new TypeError('network');
    }).catch(() => undefined);
    await run('sign', 'c', async (id) => void seen.push(id));
    expect(seen[6]).not.toBe(seen[5]);
    expect(seen.every((x) => /^[0-9a-f-]{36}$/.test(x))).toBe(true);
    expect(globalThis.localStorage?.length ?? 0).toBe(0);
  });
});
