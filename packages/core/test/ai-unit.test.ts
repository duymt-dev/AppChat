// TIP-019 (unit): Cài đặt › Mô hình AI (DTO, mức theo gói, hạ mức khi gói đổi xuống), tên tool ↔ action id, JSON Schema input
// của action (bỏ `$schema`), action → ToolSpec (map kết quả executor sang ToolOutcome), RunCancelListener (pub/sub → abort).
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { ActionDef } from '@appchat/actions';
import { AppError, aiSettingsSchema } from '@appchat/shared';
import { actionTool, aiSettingsDto, inputSchemaOf, tierFor, toolActionId, toolNameOf, type AiRunner, type AiSettingRow } from '../src';
import { RunCancelListener } from '../src/ai/runs/cancel.listener';
import { AI_CANCEL_CHANNEL } from '../src/ai/runs/runs.service';

const row = (p: Partial<AiSettingRow> = {}): AiSettingRow => ({ defaultTier: 'standard', tasks: {}, budget: 0, rateLimit: 10_000, ...p });

describe('Cài đặt › Mô hình AI', () => {
  it('DTO đúng schema; gói Miễn phí khoá nâng cao + tối đa; credit theo model_price, chưa có giá → mặc định', () => {
    const d = aiSettingsSchema.parse(aiSettingsDto(row(), 'free', { standard: 1.5 }));
    expect(d.tiers).toEqual([
      { key: 'standard', credits: '1,5', badge: 'using', active: true, locked: false },
      { key: 'advanced', credits: '4', badge: '', active: false, locked: true },
      { key: 'max', credits: '15', badge: '', active: false, locked: true },
    ]);
    expect(d.tasks.find((t) => t.key === 'order_analysis')?.tier).toBe('advanced');
  });

  it('gói Cá nhân mở nâng cao (hot), Doanh nghiệp mở tối đa', () => {
    expect(aiSettingsDto(row(), 'personal', {}).tiers.map((t) => `${t.key}:${t.locked}:${t.badge}`)).toEqual(['standard:false:using', 'advanced:false:hot', 'max:true:']);
    expect(aiSettingsDto(row({ defaultTier: 'max' }), 'business', {}).tiers.every((t) => !t.locked)).toBe(true);
  });

  it('tierFor: cài đặt tác vụ > mặc định tác vụ > mặc định chung; gói đổi xuống → hạ về mức cao nhất được phép', () => {
    expect(tierFor(row({ tasks: { copilot: 'max' } }), 'copilot', 'business')).toBe('max');
    expect(tierFor(row({ tasks: { copilot: 'max' } }), 'copilot', 'personal')).toBe('advanced');
    expect(tierFor(row(), 'insights', 'free')).toBe('standard');
    expect(tierFor(row({ defaultTier: 'advanced' }), null, 'personal')).toBe('advanced');
  });
});

describe('action → tool', () => {
  const def = { id: 'contact.search', description: 'Tìm khách', input: z.object({ q: z.string(), limit: z.number().int().optional() }) } as unknown as ActionDef;

  it('tên tool ↔ action id (dấu chấm → __)', () => {
    expect(toolNameOf('quote.send_for_approval')).toBe('quote__send_for_approval');
    expect(toolActionId('quote__send_for_approval')).toBe('quote.send_for_approval');
  });

  it('JSON Schema input không có $schema', () => {
    const s = inputSchemaOf(def) as Record<string, unknown>;
    expect(s.$schema).toBeUndefined();
    expect(s).toMatchObject({ type: 'object', required: ['q'] });
  });

  it('kết quả executor → ToolOutcome: 200 ok, 202 cần xác nhận / cần duyệt, AppError → error', async () => {
    const outcomes: unknown[] = [
      { status: 200, data: { result: { items: [] } } },
      { status: 202, data: { status: 'preview_required', preview: { n: 1 }, confirm_token: 'cf1' } },
      { status: 202, data: { status: 'approval_required', approval_id: 'ap1' } },
      new AppError('FORBIDDEN', 403, { permission: 'crm.view' }),
    ];
    let i = 0;
    const executor = {
      execute: async () => {
        const o = outcomes[i++];
        if (o instanceof Error) throw o;
        return o as never;
      },
    };
    const t = actionTool(def, executor, () => ({}) as never);
    expect(t.name).toBe('contact__search');
    expect(await t.execute({ q: 'a' }, { stepIdx: 0, toolCallId: 'c' })).toEqual({ kind: 'ok', output: { items: [] } });
    expect(await t.execute({ q: 'a' }, { stepIdx: 0, toolCallId: 'c' })).toMatchObject({ kind: 'needs_confirmation', confirmToken: 'cf1' });
    expect(await t.execute({ q: 'a' }, { stepIdx: 0, toolCallId: 'c' })).toMatchObject({ kind: 'needs_approval', approvalId: 'ap1' });
    expect(await t.execute({ q: 'a' }, { stepIdx: 0, toolCallId: 'c' })).toMatchObject({ kind: 'error', code: 'FORBIDDEN' });
  });
});

describe('RunCancelListener', () => {
  it('lệnh huỷ qua pub/sub → runner.abort đúng run; lệnh hỏng bỏ qua', async () => {
    const aborted: string[][] = [];
    let onMessage: ((ch: string, raw: string) => void) | null = null;
    const sub = { subscribe: async (ch: string) => expect(ch).toBe(AI_CANCEL_CHANNEL), on: (_e: string, f: typeof onMessage) => void (onMessage = f), quit: async () => 'OK' };
    const redis = { duplicate: () => sub } as never;
    const l = new RunCancelListener(redis, { abort: (ids: string[]) => void aborted.push(ids) } as unknown as AiRunner);
    await l.onApplicationBootstrap();
    onMessage!(AI_CANCEL_CHANNEL, JSON.stringify({ run_ids: ['r1', 2, 'r2'] }));
    onMessage!(AI_CANCEL_CHANNEL, '{hỏng');
    expect(aborted).toEqual([['r1', 'r2']]);
    await l.onApplicationShutdown();
  });
});
