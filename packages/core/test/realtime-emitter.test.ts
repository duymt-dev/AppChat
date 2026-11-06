// RedisRealtimeEmitter (TIP-039 pha 2): `@socket.io/redis-emitter` bỏ promise của `publish` — Redis rớt / đang đóng không được thành
// unhandled rejection (sập worker). Lỗi được nuốt + báo qua onError; publish thành công vẫn đi qua client thật.
import { describe, expect, it, vi } from 'vitest';
import type { Redis } from 'ioredis';
import { RedisRealtimeEmitter } from '../src/notify/realtime/emitter';

const env = { ws: 'w', rooms: ['ws:w'], event: 'billing.notice', data: { kind: 'low' } };

describe('RedisRealtimeEmitter', () => {
  it('publish reject → onError, không unhandled rejection', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    const onError = vi.fn();
    const client = {
      publish: vi.fn(() => Promise.reject(new Error('Connection is closed.'))),
      quit: vi.fn(() => Promise.resolve('OK')),
    } as unknown as Redis;
    const e = new RedisRealtimeEmitter(client, onError);
    e.publish(env);
    await new Promise((r) => setTimeout(r, 20));
    process.off('unhandledRejection', unhandled);
    expect(client.publish).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Connection is closed.' }));
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('publish thành công đi qua client; close gọi quit', async () => {
    const client = {
      publish: vi.fn(() => Promise.resolve(1)),
      quit: vi.fn(() => Promise.resolve('OK')),
    } as unknown as Redis;
    const e = new RedisRealtimeEmitter(client);
    e.publish(env);
    expect(client.publish).toHaveBeenCalledWith(expect.stringContaining('socket.io'), expect.anything());
    await e.close();
    expect(client.quit).toHaveBeenCalled();
  });
});
