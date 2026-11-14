// TIP-023e §1.4: assistant.discovery_prepare — chỉ chạy qua phiên Cowork tin cậy (ctx.runId thật, không lời gọi trực tiếp/agent/task);
// thắng lease mới → 'building' + phát assistant.discovery_requested; gốc khác đã giành (building/ready) → KHÔNG tạo yêu cầu thứ hai,
// KHÔNG phát event mới, chỉ phản chiếu lại trạng thái đang có; chưa cấu hình model embed → NOT_IMPLEMENTED (keyword vẫn dùng được).
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import type { ActionContext, TenantTx } from '../src/kernel/actions/action-context';
import { AssistantDiscoveryPrepareHandler } from '../src/ai/assistant/discovery/prepare.handler';

const NOW = new Date('2026-11-10T00:00:00Z');
const clock = { now: () => NOW };

function fakeTx(runs: Record<string, { rootRunId: string }> = {}) {
  const generations = new Map<string, Record<string, unknown>>();
  const keyOf = (c: string, s: string) => `${c}\u0000${s}`;
  return {
    aiRun: { findUnique: async ({ where }: { where: { id: string } }) => (runs[where.id] ? { id: where.id, rootRunId: runs[where.id]!.rootRunId } : null) },
    actionDiscoveryGeneration: {
      findUnique: async ({ where }: { where: { corpusHash_embeddingSpace?: { corpusHash: string; embeddingSpace: string } } }) => {
        if (!where.corpusHash_embeddingSpace) return null;
        const k = keyOf(where.corpusHash_embeddingSpace.corpusHash, where.corpusHash_embeddingSpace.embeddingSpace);
        return [...generations.values()].find((r) => keyOf(r.corpusHash as string, r.embeddingSpace as string) === k) ?? null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const k = keyOf(data.corpusHash as string, data.embeddingSpace as string);
        if ([...generations.values()].some((r) => keyOf(r.corpusHash as string, r.embeddingSpace as string) === k)) throw Object.assign(new Error('unique'), { code: 'P2002' });
        generations.set(data.id as string, { ...data });
        return { ...data };
      },
      updateMany: async () => ({ count: 0 }),
    },
  } as unknown as TenantTx;
}

const ctxOf = (runId?: string, source: ActionContext['source'] = 'assistant'): ActionContext => ({ workspaceId: 'ws', source, actor: { type: 'assistant', id: 'u1' }, authz: {} as never, ...(runId ? { runId } : {}) });

const noModels = null;
const mockModels = { candidates: async () => [{ provider: 'mock', model: 'embed-1', handle: {}, configRevision: 'rev-1' }] };

describe('AssistantDiscoveryPrepareHandler (TIP-023e §1.4)', () => {
  it('nguồn không phải assistant hoặc thiếu runId → FORBIDDEN (Cowork-only, không nhận lời gọi trực tiếp/agent/task)', async () => {
    const h = new AssistantDiscoveryPrepareHandler(clock, null, mockModels as never);
    await expect(h.execute(ctxOf(undefined), {}, fakeTx())).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(h.execute(ctxOf('run-1', 'agent'), {}, fakeTx({ 'run-1': { rootRunId: 'root-1' } }))).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('chưa cấu hình model embedding → NOT_IMPLEMENTED (keyword fallback vẫn dùng được, không phải lỗi hệ thống)', async () => {
    const h = new AssistantDiscoveryPrepareHandler(clock, null, noModels);
    await expect(h.execute(ctxOf('run-1'), {}, fakeTx({ 'run-1': { rootRunId: 'root-1' } }))).rejects.toMatchObject({ code: 'NOT_IMPLEMENTED', fields: { embed: 'no_model_route' } });
  });

  it('thắng lease mới → building + phát đúng 1 event assistant.discovery_requested gắn generation_id vừa tạo', async () => {
    const h = new AssistantDiscoveryPrepareHandler(clock, null, mockModels as never);
    const tx = fakeTx({ 'run-1': { rootRunId: 'root-1' } });
    const out = await h.execute(ctxOf('run-1'), {}, tx);
    expect(out.result.status).toBe('building');
    expect(out.events).toHaveLength(1);
    expect(out.events![0]!.topic).toBe('assistant.discovery_requested');
    expect(out.events![0]!.payload.generation_id).toBe(out.result.generation_id);
    expect(out.noUndo).toBe(true);
  });

  it('gốc khác đã giành lease (building) → KHÔNG tạo yêu cầu thứ hai, không phát event, phản chiếu đúng generation_id cũ', async () => {
    const h = new AssistantDiscoveryPrepareHandler(clock, null, mockModels as never);
    const tx = fakeTx({ 'run-1': { rootRunId: 'root-1' }, 'run-2': { rootRunId: 'root-2' } });
    const first = await h.execute(ctxOf('run-1'), {}, tx);
    const second = await h.execute(ctxOf('run-2'), {}, tx);
    expect(second.result.generation_id).toBe(first.result.generation_id);
    expect(second.result.status).toBe('building');
    expect(second.events ?? []).toHaveLength(0);
  });

  it('preview: đọc corpus + không gian embedding hiện hành, không ghi gì (bounded, trước xác nhận)', async () => {
    const h = new AssistantDiscoveryPrepareHandler(clock, null, mockModels as never);
    const p = await h.preview(ctxOf('run-1'));
    expect(p.risk).toBe('write');
    expect(typeof p.count).toBe('number');
    expect(p.changes?.[0]?.entity).toBe('action_discovery_generation');
  });

  it('preview: chưa cấu hình model embedding → vẫn trả preview (không ném) nhưng cảnh báo no_model_route', async () => {
    const h = new AssistantDiscoveryPrepareHandler(clock, null, noModels);
    const p = await h.preview(ctxOf('run-1'));
    expect(p.warnings).toContain('no_model_route');
  });
});
