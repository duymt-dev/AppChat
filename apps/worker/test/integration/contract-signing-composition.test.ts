// TIP-030c AC8: worker ROLE=jobs và ROLE=ai THẬT (WorkerModule.forRole — module production) đều có handler thật cho các action ký hợp đồng
// cha (không 501) + verifier capability 003c đã đăng ký; ROLE=jobs có runner quét hợp đồng (khôi phục lần ký + ý định OTP Owner). Gọi thẳng
// executor bằng ctx thường (không capability niêm phong) → 403 trước prepare ở mọi vai trò.
import 'reflect-metadata';
import { afterAll, describe, expect, it } from 'vitest';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { ActionExecutor, ActionHandlerRegistry, systemVerifierRegistered, uuidv7 } from '@appchat/core';
import { authzForRole } from '@appchat/shared';
import { WorkerModule } from '../../src/worker.module';
import { testEnv } from './fixtures/ai-process';

const ACTIONS = ['contract.public_open', 'contract.public_otp', 'contract.public_decline', 'contract.public_sign', 'contract.sign_attempt_prepare', 'contract.sign_attempt_stage'];
const apps: INestApplicationContext[] = [];

afterAll(async () => {
  for (const a of apps) await a.close();
});

describe.each(['jobs', 'ai'] as const)('worker ROLE=%s — ký hợp đồng cha', (role) => {
  it('handler thật + verifier đăng ký; ctx thường gọi action riêng → 403', async () => {
    Object.assign(process.env, testEnv, { ROLE: role });
    const app = await NestFactory.createApplicationContext(WorkerModule.forRole(role), { logger: false });
    apps.push(app);
    await app.init();
    const reg = app.get(ActionHandlerRegistry, { strict: false });
    for (const id of [...ACTIONS, 'contract.request_sign_otp']) expect(reg.isImplemented(id), id).toBe(true);
    for (const id of ACTIONS) expect(systemVerifierRegistered(id), id).toBe(true);
    const owner = uuidv7();
    const ctx = { workspaceId: uuidv7(), source: 'system' as const, actor: { type: 'system' as const, id: 'contract.public_sign' }, idempotencyKey: uuidv7(), authz: authzForRole('owner', owner) as never };
    await expect(app.get(ActionExecutor, { strict: false }).execute(ctx, 'contract.public_sign', { contract_id: uuidv7(), attempt_id: uuidv7() })).rejects.toMatchObject({ httpStatus: 403 });
  }, 180_000);
});
