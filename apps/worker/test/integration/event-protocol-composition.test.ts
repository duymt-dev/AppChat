// TIP-003b AC7: worker ROLE=jobs THẬT (WorkerModule.forRole — module production) khởi động xong → startEvents đóng băng registry và
// so manifest kỳ vọng độc lập. Hiện mọi consumer v1 chưa có adapter v2 → không sẵn sàng, liệt kê đủ blocker theo chủ (003c / 006b),
// không consumer v2 nào lạ; manifest phủ ĐÚNG tập consumer v1 đang đăng ký (thêm consumer mới mà quên manifest → test đỏ). Rà 2026-11-11:
// `sales.quote-owner` vẫn đăng ký (015d chỉ bỏ phần ghi, giữ drain log) — manifest ghi đúng hiện trạng.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { createLogger, eventConsumers, frozenEventRegistry } from '@appchat/core';
import { WorkerModule } from '../../src/worker.module';
import { startEvents } from '../../src/start-events';
import { EVENT_PROTOCOL_MANIFEST } from '../../src/event-protocol.manifest';
import { testEnv } from './fixtures/ai-process';

let app: INestApplicationContext;

beforeAll(async () => {
  Object.assign(process.env, testEnv, { ROLE: 'jobs' });
  app = await NestFactory.createApplicationContext(WorkerModule.forRole('jobs'), { logger: false });
  await app.init();
}, 180_000);

afterAll(async () => {
  await app?.close();
});

describe('worker ROLE=jobs — sẵn sàng giao thức sự kiện v2', () => {
  it('đóng băng SAU init; chưa có adapter v2 → không sẵn sàng, blocker đủ theo chủ; không hợp đồng v2 lạ', () => {
    expect(frozenEventRegistry()).toBeNull();
    const r = startEvents('jobs', true, createLogger({ level: 'silent' }));
    expect(frozenEventRegistry()).not.toBeNull();
    expect(r.ready).toBe(false);
    expect(r.missing).toEqual([]);
    expect(r.unexpected).toEqual([]);
    expect(r.mismatched).toEqual([]);
    const owners = new Set(r.blockers.map((b) => b.split(':')[1]));
    expect([...owners].sort()).toEqual(['003c', '006b']);
    // TIP-003c: consumer có adapter action-mode v2 không còn là blocker.
    for (const n of ['sales.bank-ingest', 'support', 'loyalty.orders', 'loyalty.payments', 'crm.lead-routing', 'sales.quote-owner', 'sales.payment-packages', 'notify', 'realtime', 'catalog-sync', 'ai-tasks']) expect(r.blockers.some((b) => b.startsWith(`${n}:`))).toBe(false);
  });

  it('manifest phủ ĐÚNG tập consumer v1 đã đăng ký ở ROLE=jobs (không thiếu)', () => {
    const registered = eventConsumers().map((c) => c.name).sort();
    const listed = EVENT_PROTOCOL_MANIFEST.consumers.map((c) => c.name).sort();
    expect(registered.filter((n) => !listed.includes(n))).toEqual([]);
  });
});
