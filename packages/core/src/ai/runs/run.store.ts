// Lưu run AI (Blueprint §2.2 `ai_run` / `ai_run_step`, §5.1 "lưu và chạy tiếp run"): tạo run, ghi bước (idempotent theo
// (run_id, idx) — chạy lại cùng bước không thêm dòng), dừng chờ người (`waiting_approval` + `state`), kết thúc, huỷ cả cây.
import type { TenantDb } from '@appchat/db';
import { toJson, type PausedState } from '@appchat/ai';
import { getAction } from '@appchat/actions';
import { uuidv7 } from '../../kernel/ids';
import { maskToolInput } from '../../kernel/actions/secret-fields';
import type { MeteredDb } from './metered-db';

type Db = Pick<TenantDb, 'aiRun' | 'aiRunStep' | '$transaction'>;
export type RunRow = NonNullable<Awaited<ReturnType<TenantDb['aiRun']['findUnique']>>>;
export type RunKind = RunRow['kind'];

export interface NewRun {
  /** Id cấp sẵn (sổ yêu cầu Trợ lý claim trước khi tạo run — TIP-023c); vắng → sinh mới. */
  id?: string;
  kind: RunKind;
  title?: string;
  tier: string;
  input: unknown;
  parentRunId?: string | null;
  initiatedByUserId?: string | null;
  agentId?: string | null;
  agentVersion?: number | null;
  conversationId?: string | null;
  assistantSessionId?: string | null;
  taskId?: string | null;
  dryRun?: boolean;
  maxCredits?: number | null;
}

export interface StepRecord {
  idx: number;
  type: 'llm' | 'tool' | 'delegate' | 'consult' | 'handoff' | 'ui_command';
  status?: 'ok' | 'error' | 'paused';
  actionId?: string | null;
  input?: unknown;
  output?: unknown;
  provider?: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  credits?: number;
  latencyMs?: number;
  meta?: unknown;
}

const json = (v: unknown) => toJson(v) as object;
export const TERMINAL = ['completed', 'failed', 'cancelled', 'handoff'] as const;

export class RunStore {
  constructor(
    private readonly db: Db,
    private readonly now: () => Date,
  ) {}

  /** DB có bảng ngân sách / biên nhận (TIP-019b) — null khi store dựng trên DB giả của test đơn vị. */
  metered(): MeteredDb | null {
    return 'aiRootBudget' in (this.db as object) ? (this.db as unknown as MeteredDb) : null;
  }

  /** Lý do dừng (TIP-019b §4.4) — ghi riêng, không đổi trạng thái. */
  async stopReason(runId: string, reason: string): Promise<void> {
    await this.db.aiRun.updateMany({ where: { id: runId }, data: { stopReason: reason.slice(0, 40) } });
  }

  async create(r: NewRun): Promise<RunRow> {
    const now = this.now();
    const id = r.id ?? uuidv7(now.getTime());
    const parent = r.parentRunId ? await this.db.aiRun.findUnique({ where: { id: r.parentRunId }, select: { rootRunId: true, depth: true } }) : null;
    return this.db.aiRun.create({
      data: {
        id,
        kind: r.kind,
        title: r.title ?? '',
        tier: r.tier,
        input: json(r.input),
        parentRunId: r.parentRunId ?? null,
        rootRunId: parent?.rootRunId ?? id,
        depth: parent ? parent.depth + 1 : 0,
        initiatedByUserId: r.initiatedByUserId ?? null,
        agentId: r.agentId ?? null,
        agentVersion: r.agentVersion ?? null,
        conversationId: r.conversationId ?? null,
        assistantSessionId: r.assistantSessionId ?? null,
        taskId: r.taskId ?? null,
        dryRun: r.dryRun ?? false,
        maxCredits: r.maxCredits ?? null,
        status: 'queued',
        startedAt: now,
      },
    });
  }

  get(id: string): Promise<RunRow | null> {
    return this.db.aiRun.findUnique({ where: { id } });
  }

  /** Chuyển `queued` / `waiting_approval` → `running` (một người thắng — chạy tiếp hai lần chỉ một lần chạy). */
  async claim(id: string, from: ('queued' | 'waiting_approval')[]): Promise<boolean> {
    const r = await this.db.aiRun.updateMany({ where: { id, status: { in: from } }, data: { status: 'running' } });
    return r.count === 1;
  }

  /** Ghi bước — trùng (run, idx) thì giữ dòng cũ (chạy lại sau lỗi không nhân đôi credit / bước). */
  async step(runId: string, s: StepRecord): Promise<void> {
    const now = this.now();
    await this.db.aiRunStep.upsert({
      where: { runId_idx: { runId, idx: s.idx } },
      create: {
        id: uuidv7(now.getTime()),
        runId,
        idx: s.idx,
        type: s.type,
        status: s.status ?? 'ok',
        actionId: s.actionId ?? null,
        // Ô bí mật (ActionDef.secret) không bao giờ nằm trong bước run (TIP-023c) — kể cả lời gọi bị chặn.
        input: json(s.type === 'tool' ? maskToolInput(s.actionId ?? null, s.input ?? {}, getAction) : (s.input ?? {})),
        output: s.output === undefined ? undefined : json(s.output),
        provider: s.provider ?? null,
        model: s.model ?? null,
        tokensIn: s.tokensIn ?? 0,
        tokensOut: s.tokensOut ?? 0,
        credits: s.credits ?? 0,
        latencyMs: s.latencyMs ?? 0,
        meta: s.meta === undefined ? undefined : json(s.meta),
        createdAt: now,
      },
      update: {},
    });
  }

  async addCredits(runId: string, credits: number): Promise<void> {
    if (credits > 0) await this.db.aiRun.update({ where: { id: runId }, data: { creditsUsed: { increment: credits }, subtreeCredits: { increment: credits } } });
  }

  /** Số thứ tự bước kế tiếp (bước LLM + tool đánh số chung). */
  async nextIdx(runId: string): Promise<number> {
    const last = await this.db.aiRunStep.findFirst({ where: { runId }, orderBy: { idx: 'desc' }, select: { idx: true } });
    return (last?.idx ?? -1) + 1;
  }

  /** `approvalId` (tool cần duyệt — TIP-021) lưu cùng state → khung điều phối hiện nút Duyệt (`Run.approval_id`). */
  async pause(runId: string, state: PausedState, approvalId?: string): Promise<void> {
    await this.db.aiRun.update({ where: { id: runId }, data: { status: 'waiting_approval', state: json({ ...state, ...(approvalId ? { approval_id: approvalId } : {}) }) } });
  }

  async finish(runId: string, status: (typeof TERMINAL)[number], data: { output?: unknown; error?: string | null } = {}): Promise<void> {
    // Đã huỷ / kết thúc ở nơi khác (run.cancel) → giữ trạng thái đó.
    await this.db.aiRun.updateMany({
      where: { id: runId, status: { notIn: [...TERMINAL] } },
      data: { status, finishedAt: this.now(), state: undefined, ...(data.output === undefined ? {} : { output: json(data.output) }), ...(data.error ? { error: data.error.slice(0, 500) } : {}) },
    });
  }

  /** Huỷ run + mọi run con chưa kết thúc (cùng gốc, sâu hơn). Trả id đã huỷ. */
  async cancelTree(runId: string): Promise<string[]> {
    const r = await this.db.aiRun.findUnique({ where: { id: runId }, select: { rootRunId: true } });
    if (!r) return [];
    const all = await this.db.aiRun.findMany({ where: { rootRunId: r.rootRunId }, select: { id: true, parentRunId: true, status: true } });
    const ids = new Set([runId]);
    for (let changed = true; changed; ) {
      changed = false;
      for (const x of all) {
        if (!x.parentRunId || !ids.has(x.parentRunId) || ids.has(x.id)) continue;
        ids.add(x.id);
        changed = true;
      }
    }
    const live = all.filter((x) => ids.has(x.id) && !(TERMINAL as readonly string[]).includes(x.status)).map((x) => x.id);
    if (live.length) await this.db.aiRun.updateMany({ where: { id: { in: live } }, data: { status: 'cancelled', finishedAt: this.now() } });
    return live;
  }
}
