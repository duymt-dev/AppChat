// TIP-021b §1.3–1.5 (AC1–AC3): discovery trước sinh — chia đoạn ≤ 1000 code unit an toàn Unicode (≤ 3 đoạn, ghép lại = gốc), mỗi đoạn
// limit 8, gộp bỏ trùng tất định ≤ 24; ứng viên = public ∩ agentGrantable ∩ có handler ∩ quyền hiện hành (lọc TRƯỚC rank — không lộ id
// cấm / internal / chưa có handler); kho lạnh / không route embed → từ khoá trung thực, không gọi embed / dựng kho.
import { describe, expect, it, vi } from 'vitest';
import { isAgentGrantable, isInternalAction, registry } from '@appchat/actions';
import { authzForRole, type AuthzContext } from '@appchat/shared';
import { CANDIDATE_MAX, CHUNK_MAX, chunkDescription, discoverDraftTools, grantableForAgent, PER_QUERY, type DraftDiscoveryDeps } from '../src/ai/agents/drafting/discovery';

const owner = authzForRole('owner', 'u1');
const all = () => true;
const db = (gen: unknown = null) => ({ actionDiscoveryGeneration: { findUnique: vi.fn().mockResolvedValue(gen) }, $queryRaw: vi.fn().mockResolvedValue([]), aiRun: { findUnique: vi.fn() } }) as unknown as DraftDiscoveryDeps['db'];
const deps = (over: Partial<DraftDiscoveryDeps> = {}): DraftDiscoveryDeps => ({ db: db(), models: null, queryVector: null, ...over });

describe('chunkDescription — biên đoạn', () => {
  it('≤ 1000 code unit → một đoạn; 1001 → hai đoạn, ghép lại đúng gốc', () => {
    expect(chunkDescription('a'.repeat(1000))).toHaveLength(1);
    const s = 'a'.repeat(1001);
    const c = chunkDescription(s);
    expect(c).toHaveLength(2);
    expect(c.join('')).toBe(s);
    expect(c.every((x) => x.length <= CHUNK_MAX)).toBe(true);
  });

  it('2000 ký tự cắt ở khoảng trắng → tối đa 3 đoạn, không mất chữ', () => {
    const s = Array.from({ length: 400 }, (_, i) => `từ${i}`).join(' ').slice(0, 2000);
    const c = chunkDescription(s);
    expect(c.length).toBeGreaterThanOrEqual(2);
    expect(c.length).toBeLessThanOrEqual(3);
    expect(c.join('')).toBe(s);
  });

  it('không tách cặp surrogate (emoji ở biên 1000)', () => {
    const s = `${'a'.repeat(999)}😀${'b'.repeat(500)}`;
    const c = chunkDescription(s);
    expect(c[0]!.endsWith('\ud83d')).toBe(false);
    expect(c.join('')).toBe(s);
  });
});

describe('discoverDraftTools — ứng viên đã lọc quyền hiện hành', () => {
  it('chỉ action public + agentGrantable + có handler + được quyền; ≤ 24; không internal', async () => {
    const r = await discoverDraftTools(deps(), owner, all, 'Agent CSKH cho spa: đặt lịch hẹn, tạo ticket khiếu nại, trả lời Zalo');
    expect(r.candidates.length).toBeGreaterThan(0);
    expect(r.candidates.length).toBeLessThanOrEqual(CANDIDATE_MAX);
    const defs = new Map(registry.map((a) => [a.id, a]));
    for (const c of r.candidates) {
      const a = defs.get(c.id)!;
      expect(isAgentGrantable(a), c.id).toBe(true);
      expect(isInternalAction(a), c.id).toBe(false);
      expect(c.description.length).toBeLessThanOrEqual(2000);
      expect(c.schemaHash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('kho lạnh / không route embed → keyword + no_model_route, không gọi generation / embed', async () => {
    const d = deps();
    const r = await discoverDraftTools(d, owner, all, 'Agent đặt lịch spa');
    expect(r.strategy).toBe('keyword');
    expect(r.reason).toBe('no_model_route');
    expect((d.db as unknown as { actionDiscoveryGeneration: { findUnique: ReturnType<typeof vi.fn> } }).actionDiscoveryGeneration.findUnique).not.toHaveBeenCalled();
  });

  it('có route nhưng chưa build kho → corpus_not_ready, không embed câu hỏi (không dựng kho, không tính phí)', async () => {
    const embed = vi.fn();
    const models = { candidates: async () => [{ provider: 'p', model: 'e', handle: null, configRevision: 'r' }] };
    const r = await discoverDraftTools(deps({ models, queryVector: () => embed }), owner, all, 'Agent CSKH ticket');
    expect(r.reason).toBe('corpus_not_ready');
    expect(embed).not.toHaveBeenCalled();
  });

  it('mỗi đoạn một truy vấn limit 8 — mô tả 1500 ký tự gọi discovery 2 lần', async () => {
    const svc = await import('../src/ai/assistant/discovery/service');
    const spy = vi.spyOn(svc, 'discoverActions');
    await discoverDraftTools(deps(), owner, all, `${'đặt lịch hẹn spa '.repeat(60)}${'tạo ticket bảo hành '.repeat(40)}`.slice(0, 1500));
    expect(spy.mock.calls.length).toBe(2);
    for (const call of spy.mock.calls) {
      expect(call[1].limit).toBe(PER_QUERY);
      expect(call[1].query.length).toBeLessThanOrEqual(CHUNK_MAX);
      expect(call[1].admit).toBe(grantableForAgent);
    }
    spy.mockRestore();
  });

  it('người ra lệnh không có quyền của action → id đó không thành ứng viên (canary: ticket.create với Viewer)', async () => {
    const viewer: AuthzContext = { ...authzForRole('owner', 'u2'), isOwner: false, permissions: new Set(['agents.manage']) };
    const r = await discoverDraftTools(deps(), viewer, all, 'Agent CSKH tạo ticket khiếu nại, đặt lịch hẹn');
    expect(r.candidates.map((c) => c.id)).not.toContain('ticket.create');
    expect(r.candidates.map((c) => c.id)).not.toContain('appointment.create');
  });

  it('action chưa có handler (stub) không bao giờ thành ứng viên', async () => {
    const r = await discoverDraftTools(deps(), owner, (id) => id !== 'ticket.create', 'Agent CSKH tạo ticket khiếu nại');
    expect(r.candidates.map((c) => c.id)).not.toContain('ticket.create');
  });

  it('không ứng viên nào → kết quả hợp lệ rỗng (không nới quyền, không handoff mặc định)', async () => {
    const r = await discoverDraftTools(deps(), owner, () => false, 'Agent CSKH');
    expect(r.candidates).toEqual([]);
    expect(r.strategy).toBe('none');
  });

  it('thứ tự + vân tay tất định (cùng mô tả → cùng kết quả)', async () => {
    const a = await discoverDraftTools(deps(), owner, all, 'Agent bán hàng báo giá Zalo');
    const b = await discoverDraftTools(deps(), owner, all, 'Agent bán hàng báo giá Zalo');
    expect(a.candidates.map((c) => c.id)).toEqual(b.candidates.map((c) => c.id));
    expect(a.fingerprint).toBe(b.fingerprint);
  });
});
