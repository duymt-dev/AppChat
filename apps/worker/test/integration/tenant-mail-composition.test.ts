// TIP-012c §2.5 (AC6): mail của DN ghép đúng gốc thật của worker — ROLE=jobs có op gọi provider `mail.send` + bộ xử lý miền marketing +
// sink sự kiện giao thư; ROLE=channels chỉ đặt chỗ gửi chiến dịch (không op gọi provider, không bộ xử lý miền); ROLE=ai không có worker
// mail nào. Dựng context Nest từ WorkerModule.forRole (module production, Postgres + Redis của test), mỗi role một lượt, đóng hẳn trước
// role kế (registry theo tiến trình được gỡ ở shutdown). Thiếu sink miền → áp sự kiện 503, không đánh dấu đã áp.
import 'reflect-metadata';
import { afterEach, describe, expect, it } from 'vitest';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { MAIL_SEND_OP, PROBE_OP, callOpSafety, mailDomainRegistered, mailEventSinkRegistered } from '@appchat/core';
import { WorkerModule } from '../../src/worker.module';
import { testEnv } from './fixtures/ai-process';

let app: INestApplicationContext | null = null;

async function boot(role: string): Promise<INestApplicationContext> {
  Object.assign(process.env, testEnv, { ROLE: role });
  app = await NestFactory.createApplicationContext(WorkerModule.forRole(role), { logger: false });
  await app.init();
  return app;
}

afterEach(async () => {
  await app?.close();
  app = null;
});

const snapshot = () => ({ op: callOpSafety(MAIL_SEND_OP), probe: callOpSafety(PROBE_OP), domain: mailDomainRegistered(), sink: mailEventSinkRegistered() });

describe('worker — ghép mail của DN theo ROLE', () => {
  it('ROLE=jobs: op mail.send (mutation) + bộ xử lý miền + sink sự kiện; đóng → gỡ hết', async () => {
    await boot('jobs');
    expect(snapshot()).toEqual({ op: 'mutation', probe: expect.any(String), domain: true, sink: true });
    await app!.close();
    app = null;
    expect(snapshot()).toEqual({ op: null, probe: null, domain: false, sink: false });
  });

  it('ROLE=channels: không op gọi provider, không bộ xử lý miền gửi mail (chỉ đặt chỗ chiến dịch)', async () => {
    await boot('channels');
    const s = snapshot();
    expect(s.op).toBeNull();
    expect(s.domain).toBe(false);
  });

  it('ROLE=ai: không worker mail trùng — không op gọi provider, không bộ xử lý miền', async () => {
    await boot('ai');
    const s = snapshot();
    expect(s.op).toBeNull();
    expect(s.domain).toBe(false);
  });
});
