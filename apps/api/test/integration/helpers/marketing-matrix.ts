// Khung chung cho ma trận action marketing (TIP-037): harness ma trận (`matrix`) + dữ liệu marketing (`Mk` — khách có hội thoại Zalo 1-1,
// chiến dịch qua action thật) + ô system-only dùng chung (HTTP 403 kể cả Owner, header system 422, ẩn khỏi Trợ lý / agent).
import { expect } from 'vitest';
import { SYSTEM_ONLY, assistantAllows } from '@appchat/core';
import { authzForRole } from '@appchat/shared';
import { matrix, type Matrix } from './action-matrix';
import { Mk } from './marketing-fixtures';

export interface MkMatrix {
  m: Matrix;
  mk: Mk;
  /** Tài khoản Zalo cá nhân đang kết nối (gửi chiến dịch). */
  zalo: string;
  close(): Promise<void>;
}

export async function mkMatrix(id: string): Promise<MkMatrix> {
  const m = await matrix(id);
  const mk = new Mk(m.h);
  const zalo = await mk.account('zalo_personal', 'Zalo ma trận');
  return {
    m,
    mk,
    zalo,
    close: async () => {
      await mk.close();
      await m.close();
    },
  };
}

/** Nháp Zalo cho một khách mới có hội thoại 1-1 → id chiến dịch. */
export async function draftOf(x: MkMatrix, name = 'Nháp ma trận'): Promise<string> {
  const k = await x.mk.contact({ zaloAccount: x.zalo });
  const r = await x.mk.act('campaign.create', { name, channel: 'zalo', account_id: x.zalo, contact_ids: [k], content: { text: 'Chào {ten}' } });
  if (r.status !== 200) throw new Error(`campaign.create ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
  return r.body.data.result.campaign_id as string;
}

/** Chiến dịch đã duyệt + một vòng scheduler + kênh nhận (accepted) → id chiến dịch đang chạy có người nhận "đã gửi". */
export async function sentCampaign(x: MkMatrix): Promise<string> {
  const k = await x.mk.contact({ zaloAccount: x.zalo });
  const { id } = await x.mk.campaign({ contacts: [k], account: x.zalo, approve: true });
  x.m.h.clock.advance(60_000);
  await x.mk.tick();
  for (const r of await x.mk.recipients(id)) await x.mk.deliver(r.id, 'accepted');
  return id;
}

export const iso = (ms: number) => new Date(ms).toISOString().replace('Z', '+00:00');

/** Ô chung action hệ thống: HTTP ui / assistant → 403 kể cả Owner; header system → 422; không agentGrantable, ẩn khỏi Trợ lý. */
export async function expectSystemOnly(m: Matrix, input: unknown): Promise<void> {
  expect((await m.act(input)).status).toBe(403);
  expect((await m.act(input, undefined, { 'x-action-source': 'assistant' })).status).toBe(403);
  expect((await m.act(input, undefined, { 'x-action-source': 'system' })).status).toBe(422);
  expect(m.def.agentGrantable).toBe(false);
  expect(SYSTEM_ONLY.has(m.def.id)).toBe(true);
  expect(assistantAllows(m.def, authzForRole('owner', 'u1'))).toBe(false);
}
