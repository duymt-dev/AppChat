// Dựng dữ liệu cho ma trận action kênh (TIP-023b): tài khoản kênh ở DB tenant (luồng kết nối thật đã kiểm ở channels / email test) và gói
// Team (hạn mức kênh > 1) cho action thêm tài khoản.
import { uuidv7 } from '@appchat/core';
import type { Matrix } from './action-matrix';

export async function account(m: Matrix, type: string, name: string, o: { status?: 'connected' | 'expired' | 'connecting'; paused?: boolean; settings?: object } = {}): Promise<string> {
  const id = uuidv7();
  m.h.clock.advance(1000);
  await (await m.db()).channelAccount.create({
    data: { id, type, name, status: o.status ?? 'connected', settings: o.settings ?? {}, pausedAt: o.paused ? m.h.clock.now() : null, createdAt: m.h.clock.now() },
  });
  return id;
}

export async function teamPlan(m: Matrix): Promise<void> {
  const team = await m.h.platform.plan.findUniqueOrThrow({ where: { key: 'team' } });
  await m.h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: m.h.ws, planId: team.id, status: 'active', currentPeriodStart: m.h.clock.now() } });
}
