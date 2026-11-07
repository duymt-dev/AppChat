// Lưu run AI (Blueprint §2.2 `ai_run` / `ai_run_step`, §5.1 "lưu và chạy tiếp run"): tạo run, ghi bước (idempotent theo
// (run_id, idx) — chạy lại cùng bước không thêm dòng), dừng chờ người (`waiting_approval` + `state`), kết thúc, huỷ cả cây.
import type { TenantDb } from '@appchat/db';
import { toJson, type PausedState } from '@appchat/ai';
import { getAction } from '@appchat/actions';
import { uuidv7 } from '../../kernel/ids';
import { maskToolInput } from '../../kernel/actions/secret-fields';
import type { MeteredDb } from './metered-db';
import type { KeyValueStore } from '../../kernel/redis';
import { markDirty } from '../../kernel/outbox/outbox';
import type { TenantTx } from '../../kernel/actions/action-context';
import { appendRunEvent, type RunEventInput } from './run-events';

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
  /** Khoá con dưới cha tin cậy (TIP-019b §3): `<bước>:<action>` — duy nhất theo (cha, khoá). */
  childKey?: string | null;
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
/** Trạng thái chờ (TIP-019b §4.4) — khác nhau, không gộp. */
export const WAITING = ['waiting_approval', 'waiting_child', 'waiting_operation', 'waiting_usage'] as const;
export type WaitStatus = (typeof WAITING)[number];
type ClaimFrom = 'queued' | WaitStatus;

export class RunStore {
  constructor(
    private readonly db: Db,
    private readonly now: () => Date,
    /** Có workspace → mỗi bước / chuyển trạng thái ghi `ai_run_event` + outbox trong cùng transaction (TIP-019b §5.3). */
    private readonly events: { ws: string; kv?: Pick<KeyValueStore, 'sadd'> | null } | null = null,
  ) {}

  /** Bản ghi sự kiện cho workspace `ws` (runner / handoff / huỷ dùng). */
  observed(ws: string, kv?: Pick<KeyValueStore, 'sadd'> | null): RunStore {
    return new RunStore(this.db, this.now, { ws, kv: kv ?? null });
  }

  /** Ghi thay đổi + sự kiện cùng transaction (DB là tx sẵn → ghi thẳng); không theo dõi sự kiện → chỉ ghi thay đổi. */
  private async tracked<T>(write: (tx: Db) => Promise<T>, ev: (r: T) => RunEventInput | null): Promise<T> {
    if (!this.events) return write(this.db);
    const ws = this.events.ws;
    const now = this.now();
    const run = async (tx: Db) => {
      const r = await write(tx);
      const e = ev(r);
      if (e) await appendRunEvent(tx as unknown as TenantTx, ws, e, now);
      return r;
    };
    const out = typeof this.db.$transaction === 'function' ? await this.db.$transaction((tx) => run(tx as unknown as Db)) : await run(this.db);
    if (this.events.kv) await markDirty(this.events.kv as KeyValueStore, ws).catch(() => undefined);
    return out;
  }

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
        childKey: r.childKey ?? null,
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
  async claim(id: string, from: ClaimFrom[]): Promise<boolean> {
    const r = await this.tracked(
      (db) => db.aiRun.updateMany({ where: { id, status: { in: from } }, data: { status: 'running' } }),
      (x) => (x.count ? { runId: id, kind: 'status', status: 'running' } : null),
    );
    return r.count === 1;
  }

  /** Ghi bước — trùng (run, idx) thì giữ dòng cũ (chạy lại sau lỗi không nhân đôi credit / bước). */
  async step(runId: string, s: StepRecord): Promise<void> {
    const now = this.now();
    await this.tracked(async (db) => {
      const before = await db.aiRunStep.findUnique({ where: { runId_idx: { runId, idx: s.idx } }, select: { id: true } });
      await db.aiRunStep.upsert({
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
      return !before;
    }, (created) => (created ? { runId, kind: 'step', status: s.status ?? 'ok', stepIdx: s.idx } : null));
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
    await this.wait(runId, 'waiting_approval', { ...state, ...(approvalId ? { approval_id: approvalId } : {}) });
  }

  /** Dừng chờ có kiểu (TIP-019b §4.3): chờ duyệt / run con / thao tác nền tảng / đối soát usage — state giữ lời gọi đang chờ. */
  async wait(runId: string, status: WaitStatus, state: unknown): Promise<void> {
    await this.tracked(
      (db) => db.aiRun.updateMany({ where: { id: runId, status: { notIn: [...TERMINAL] } }, data: { status, state: json(state) } }),
      (r) => (r.count ? { runId, kind: 'status', status } : null),
    );
  }

  async finish(runId: string, status: (typeof TERMINAL)[number], data: { output?: unknown; error?: string | null } = {}): Promise<void> {
    // Đã huỷ / kết thúc ở nơi khác (run.cancel) → giữ trạng thái đó.
    await this.tracked(
      (db) =>
        db.aiRun.updateMany({
          where: { id: runId, status: { notIn: [...TERMINAL] } },
          data: { status, finishedAt: this.now(), state: undefined, ...(data.output === undefined ? {} : { output: json(data.output) }), ...(data.error ? { error: data.error.slice(0, 500) } : {}) },
        }),
      // `run.done` đúng một lần: chỉ lần chuyển thắng CAS (đã kết thúc ở nơi khác → không phát lại).
      (r) => (r.count ? { runId, kind: 'status', status } : null),
    );
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
    if (!live.length) return [];
    const done: string[] = [];
    // Mỗi run một CAS → `run.done` chỉ cho run thật sự chuyển sang huỷ ở lượt này.
    for (const id of live) {
      const r = await this.tracked(
        (db) => db.aiRun.updateMany({ where: { id, status: { notIn: [...TERMINAL] } }, data: { status: 'cancelled', finishedAt: this.now(), stopReason: 'cancelled' } }),
        (x) => (x.count ? { runId: id, kind: 'status', status: 'cancelled' } : null),
      );
      if (r.count) done.push(id);
    }
    return done;
  }
}
