// TIP-032d §3.3 (thuần, không DB): tệp đưa cho Trợ lý TRƯỚC khi biết đích → sao chép có đồng ý vào đúng bản ghi. Adapter nguồn (AI) kiểm
// chủ / revision / phase / phiên của run / tệp gốc còn; HTML / EML / markdown không bao giờ thành tệp đính kèm bản ghi. Registry kernel trung
// lập: chưa đăng ký → 422 artifact_copy_unavailable. Bản sao: id tất định theo (người, đích, nguồn, revision, digest, thao tác) — chạy lại
// cùng thao tác trúng tệp cũ, đích khác / thao tác khác → id khác; đã gắn sống cùng digest → không sao chép thêm. Gắn: kiểm lại nguồn trong
// transaction (thu hồi → không gắn), dữ kiện xem trước lệch → 409 xem trước lại; artifact gốc không đổi.
import { describe, expect, it } from 'vitest';
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../src/kernel/actions/action-context';
import type { FilesService } from '../src/kernel/files/files.service';
import { attachmentSource } from '../src/kernel/files/attachment-source-registry';
import { ASSISTANT_ARTIFACT_SOURCE, registerAssistantArtifactSource } from '../src/ai/assistant/input/record-attachment-source';
import { copyArtifact, copyIdOf, sourceFact, type ArtifactRef } from '../src/sales/files/artifact-copy';
import { AttachmentKit, type RecordPort } from '../src/sales/files/handlers-kit';

const U = '0193a000-0000-7000-8000-0000000000b1';
const OTHER = '0193a000-0000-7000-8000-0000000000b2';
const A = '0193a000-0000-7000-8000-0000000000c1';
const SRC_FILE = '0193a000-0000-7000-8000-0000000000f1';
const SESSION = '0193a000-0000-7000-8000-0000000000d1';
const RUN = '0193a000-0000-7000-8000-0000000000e1';
const P = '0193a000-0000-7000-8000-0000000000a1';
const Q = '0193a000-0000-7000-8000-0000000000a2';
const DIGEST = 'a'.repeat(64);
const ref: ArtifactRef = { kind: 'assistant_artifact_ref', artifact_id: A, revision: 2 };

type Thrown = { httpStatus?: number; code?: string; fields?: unknown };
const err = (p: Promise<unknown>) => p.then(() => null, (e: Thrown) => ({ status: e.httpStatus, fields: e.fields }));

type Art = { id: string; ownerUserId: string; revision: number; phase: string; sessionId: string | null; fileId: string; fileDigest: string; name: string; kind: string | null };
const art = (o: Partial<Art> = {}): Art => ({ id: A, ownerUserId: U, revision: 2, phase: 'ready', sessionId: SESSION, fileId: SRC_FILE, fileDigest: DIGEST, name: 'Biên bản.pdf', kind: 'pdf', ...o });
type SrcFile = { uploadedBy: string; purpose: string; sha256: string } | null;
const srcDb = (a: Art | null, f: SrcFile = { uploadedBy: U, purpose: 'attachment', sha256: DIGEST }, run = { assistantSessionId: SESSION, initiatedByUserId: U }) =>
  ({ assistantInputArtifact: { findUnique: async () => a }, aiRun: { findUnique: async () => run }, file: { findUnique: async () => f } }) as unknown as TenantTx;
const locate = (db: TenantTx, runId?: string, r = ref) => ASSISTANT_ARTIFACT_SOURCE.locate(db, { userId: U, ...(runId ? { runId } : {}), ref: { kind: r.kind, id: r.artifact_id, revision: r.revision } });

describe('adapter nguồn assistant_artifact_ref', () => {
  it('đúng chủ / revision / sẵn sàng / phiên run / tệp gốc → bộ định vị bytes gốc (không phần đã trích)', async () => {
    expect(await locate(srcDb(art()), RUN)).toEqual({ fileId: SRC_FILE, digest: DIGEST, name: 'Biên bản.pdf' });
  });
  it('upload trước khi biết đích (chưa buộc phiên) → vẫn định vị được', async () => {
    expect((await locate(srcDb(art({ sessionId: null })), RUN)).fileId).toBe(SRC_FILE);
  });
  it('artifact của người khác → 404 (không lộ tồn tại)', async () => {
    expect(await err(locate(srcDb(art({ ownerUserId: OTHER })), RUN))).toEqual({ status: 404, fields: { artifact_id: 'not_found' } });
  });
  it('revision lệch (người dùng đã gỡ / thay tệp) → 409 stale_revision, không im lặng đổi nguồn', async () => {
    expect(await err(locate(srcDb(art({ revision: 3 })), RUN))).toEqual({ status: 409, fields: { source: 'stale_revision' } });
  });
  it('chưa sẵn sàng / đã huỷ → 409 theo phase', async () => {
    expect(await err(locate(srcDb(art({ phase: 'cancelled' })), RUN))).toEqual({ status: 409, fields: { source: 'cancelled' } });
  });
  it('artifact buộc phiên khác với run đang gọi → 409 other_session', async () => {
    expect(await err(locate(srcDb(art(), undefined, { assistantSessionId: 'x', initiatedByUserId: U }), RUN))).toEqual({ status: 409, fields: { source: 'other_session' } });
    expect(await err(locate(srcDb(art(), undefined, { assistantSessionId: SESSION, initiatedByUserId: OTHER }), RUN))).toEqual({ status: 409, fields: { source: 'other_session' } });
  });
  it('tệp gốc mất / bị thay (digest lệch) / purpose khác → 404 source unavailable', async () => {
    expect(await err(locate(srcDb(art(), null), RUN))).toEqual({ status: 404, fields: { source: 'unavailable' } });
    expect(await err(locate(srcDb(art(), { uploadedBy: U, purpose: 'attachment', sha256: 'b'.repeat(64) }), RUN))).toEqual({ status: 404, fields: { source: 'unavailable' } });
    expect(await err(locate(srcDb(art(), { uploadedBy: U, purpose: 'kb', sha256: DIGEST }), RUN))).toEqual({ status: 404, fields: { source: 'unavailable' } });
  });
  it('HTML / EML / markdown (đọc được ở Trợ lý) không bao giờ thành tệp đính kèm bản ghi → 422 type_not_allowed', async () => {
    for (const kind of ['html', 'eml', 'markdown']) expect(await err(locate(srcDb(art({ kind })), RUN))).toEqual({ status: 422, fields: { source: 'type_not_allowed' } });
  });
  it('registry kernel: loại nguồn chưa đăng ký → 422 artifact_copy_unavailable; đăng ký từ input providers → adapter AI', () => {
    expect(() => attachmentSource('unit_test_source')).toThrow();
    registerAssistantArtifactSource();
    expect(attachmentSource('assistant_artifact_ref')).toBe(ASSISTANT_ARTIFACT_SOURCE);
  });
});

describe('id bản sao tất định', () => {
  const base = { userId: U, parentType: 'order' as const, parentId: P, source: ref, digest: DIGEST, operation: 'assistant:run:1:call' };
  it('cùng thao tác → cùng id (chạy lại sau crash không sao chép trùng); dạng UUID', () => {
    expect(copyIdOf(base)).toBe(copyIdOf({ ...base }));
    expect(copyIdOf(base)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  it('đổi đích / loại đích / người / revision / digest / thao tác → id khác (đổi đích cần đồng ý mới)', () => {
    const id = copyIdOf(base);
    for (const o of [{ parentId: Q }, { parentType: 'invoice' as const }, { userId: OTHER }, { source: { ...ref, revision: 3 } }, { digest: 'b'.repeat(64) }, { operation: 'assistant:run:2:call' }]) expect(copyIdOf({ ...base, ...o })).not.toBe(id);
  });
  it('dữ kiện xem trước ràng artifact + revision + digest', () => {
    expect(sourceFact(ref, DIGEST)).toEqual({ source: `${A}:2:${DIGEST}` });
  });
});

/** DB giả cho copyArtifact: tệp / claim / staging trong Map; $transaction chạy fn với chính nó + nguồn. */
function copyDb(o: { live?: string | null; art?: Art } = {}) {
  const files = new Map<string, { sha256: string; purpose: string; name: string }>();
  const staging = new Map<string, { parentId: string; parentType: string; uploadedBy: string }>();
  const claims = new Set<string>();
  const tx = {
    ...srcDb(o.art ?? art()),
    file: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) => (id === SRC_FILE ? { uploadedBy: U, purpose: 'attachment', sha256: DIGEST } : (files.get(id) ?? null)),
    },
    fileClaim: { findUnique: async ({ where: { fileId } }: { where: { fileId: string } }) => (claims.has(fileId) ? { fileId } : null) },
    attachmentStaging: {
      createMany: async ({ data }: { data: { fileId: string; parentId: string; parentType: string; uploadedBy: string }[] }) => {
        for (const d of data) if (!staging.has(d.fileId)) staging.set(d.fileId, d);
        return { count: 1 };
      },
    },
  };
  const db = { ...tx, $transaction: async <T>(fn: (t: unknown) => Promise<T>) => fn(tx) } as unknown as TenantDb;
  let uploads = 0;
  const svc = {
    read: async (_d: unknown, id: string) => (id === SRC_FILE ? { row: { id, name: 'x', mime: 'application/pdf', size: 4, sha256: DIGEST }, body: Buffer.from('%PDF') } : null),
    upload: async (_d: unknown, _ws: string, f: { id: string; name: string; purpose: string }) => {
      uploads++;
      files.set(f.id, { sha256: DIGEST, purpose: f.purpose, name: f.name });
      return { id: f.id, name: f.name, mime: 'application/pdf', size: 4, sha256: DIGEST };
    },
  } as unknown as FilesService;
  const args = (over: Partial<Parameters<typeof copyArtifact>[2]> = {}) => ({
    ws: 'ws',
    userId: U,
    runId: RUN,
    operation: 'op-1',
    source: ref,
    parentType: 'order' as const,
    parentId: P,
    checkTarget: async () => undefined,
    reuse: async () => o.live ?? null,
    ...over,
  });
  return { db, svc, files, staging, claims, args, uploads: () => uploads };
}

describe('copyArtifact — sao chép riêng cho đích', () => {
  it('tạo tệp MỚI purpose record_attachment (id tất định) + staging đúng đích; nguồn gốc không đổi', async () => {
    const h = copyDb();
    const id = await copyArtifact(h.db, h.svc, h.args());
    expect(id).not.toBe(SRC_FILE);
    expect(h.files.get(id)).toEqual({ sha256: DIGEST, purpose: 'record_attachment', name: 'Biên bản.pdf' });
    expect(h.staging.get(id)).toMatchObject({ parentId: P, parentType: 'order', uploadedBy: U });
  });
  it('chạy lại cùng thao tác → cùng tệp, không tải lần hai; thao tác khác → bản sao khác', async () => {
    const h = copyDb();
    const a = await copyArtifact(h.db, h.svc, h.args());
    const b = await copyArtifact(h.db, h.svc, h.args());
    expect(b).toBe(a);
    expect(h.uploads()).toBe(1);
    expect(await copyArtifact(h.db, h.svc, h.args({ operation: 'op-2' }))).not.toBe(a);
  });
  it('bản sao đã gắn (claim có) → không tạo lại staging', async () => {
    const h = copyDb();
    const id = await copyArtifact(h.db, h.svc, h.args());
    h.staging.clear();
    h.claims.add(id);
    expect(await copyArtifact(h.db, h.svc, h.args())).toBe(id);
    expect(h.staging.size).toBe(0);
  });
  it('đích đã có liên kết sống cùng digest → trả tệp đó, không sao chép', async () => {
    const h = copyDb({ live: 'live-file' });
    expect(await copyArtifact(h.db, h.svc, h.args())).toBe('live-file');
    expect(h.uploads()).toBe(0);
  });
  it('đích không ghi được → lỗi từ checkTarget, không sao chép', async () => {
    const h = copyDb();
    const deny = async () => {
      throw Object.assign(new Error('x'), { httpStatus: 403, fields: { parent: 'read_only' } });
    };
    expect(await err(copyArtifact(h.db, h.svc, h.args({ checkTarget: deny })))).toEqual({ status: 403, fields: { parent: 'read_only' } });
    expect(h.uploads()).toBe(0);
  });
  it('nguồn thu hồi (đã gỡ → revision mới) → 409, không sao chép', async () => {
    const h = copyDb({ art: art({ revision: 3, phase: 'cancelled' }) });
    expect(await err(copyArtifact(h.db, h.svc, h.args()))).toEqual({ status: 409, fields: { source: 'stale_revision' } });
    expect(h.uploads()).toBe(0);
  });
});

describe('AttachmentKit — nhánh artifact khi gắn', () => {
  const port = {
    table: { type: 'order', live: async () => null },
    sql: 'order_attachment',
    idField: 'order_id',
    lockWritable: async () => ({ code: 'DH-1' }),
    readable: async () => ({ code: 'DH-1' }),
    writable: async () => true,
  } as unknown as RecordPort;
  const ctx = (o: object = {}) => ({ workspaceId: 'ws', source: 'assistant', actor: { type: 'assistant', id: U }, onBehalfOfUserId: U, runId: RUN, authz: { isOwner: true }, ...o }) as never;
  const input = { source: ref, if_revision: 0 };

  it('thiếu tenants / files (vai trò không nạp) → 422 artifact_copy_unavailable, không giả "đã gắn"', async () => {
    const kit = new AttachmentKit(port, null, null, () => new Date());
    expect(await err(kit.prepare(ctx(), P, input))).toEqual({ status: 422, fields: { source: 'artifact_copy_unavailable' } });
    expect(await err(kit.attach(ctx(), srcDb(art()), P, input, undefined))).toEqual({ status: 422, fields: { source: 'artifact_copy_unavailable' } });
  });
  it('nguồn bị thu hồi giữa prepare và gắn → 409, không gắn bản sao', async () => {
    const kit = new AttachmentKit(port, null, null, () => new Date());
    expect(await err(kit.attach(ctx(), srcDb(art({ revision: 3 })), P, input, { fileId: 'copy', digest: DIGEST }))).toEqual({ status: 409, fields: { source: 'stale_revision' } });
  });
  it('dữ kiện xem trước lệch digest hiện hành → 409 preview stale (xem trước lại)', async () => {
    const kit = new AttachmentKit(port, null, null, () => new Date());
    const bound = { previewFacts: sourceFact(ref, 'c'.repeat(64)) };
    expect(await err(kit.attach(ctx(bound), srcDb(art()), P, input, { fileId: 'copy', digest: DIGEST }))).toEqual({ status: 409, fields: { preview: 'stale', source: 'changed' } });
  });
  it('xem trước nêu tên tệp nguồn + đích; bindPreview ràng revision + digest', async () => {
    const kit = new AttachmentKit(port, null, null, () => new Date());
    const tx = srcDb(art());
    const p = await kit.previewAttach(ctx(), tx, P, input);
    expect(p.summary).toBe('DH-1 · Biên bản.pdf');
    expect(await kit.bindAttach(ctx(), tx, input)).toEqual(sourceFact(ref, DIGEST));
    expect(await kit.bindAttach(ctx(), tx, { source: { kind: 'target_upload_handle', file_id: SRC_FILE }, if_revision: 0 })).toEqual({});
  });
});
