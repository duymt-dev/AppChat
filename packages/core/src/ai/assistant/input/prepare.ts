// Chuẩn bị MỘT artifact (TIP-023f §1.5): giành lease có fence → đọc tệp gốc qua guard hiện hành (nguồn bị thu hồi / hết hạn → lỗi
// `source_unavailable`, không parse) → parse trong sandbox NGOÀI transaction → công bố phần trong transaction ngắn chỉ khi revision +
// fence còn khớp. Parse thuần tất định nên worker hết lease bị tái nhận an toàn; kết quả trễ bị loại ở publishParts.
import type { TenantDb } from '@appchat/db';
import { checkFile } from '../../../kernel/files/file-access';
import type { Storage } from '../../../kernel/files/storage';
import { ATTACHMENT_RULE } from '../genui/attachments';
import { claimLease, failArtifact, publishParts } from './artifact-store';
import { parseIsolated, type SandboxConfig } from './sandbox';

export interface PrepareDeps {
  storage: Storage;
  sandbox: SandboxConfig;
  now: () => Date;
  owner: string;
}

export type PrepareOutcome = 'ready' | 'failed' | 'skipped';

export async function prepareArtifact(db: TenantDb, id: string, d: PrepareDeps): Promise<PrepareOutcome> {
  const a = await claimLease(db, id, d.owner, d.now());
  if (!a) return 'skipped';
  const fail = async (reason: Parameters<typeof failArtifact>[1]['reason']) => ((await failArtifact(db, { id, revision: a.revision, fence: a.fence, reason, now: d.now() })) ? 'failed' : 'skipped');
  const src = await checkFile(db, a.ownerUserId, a.fileId, { ...ATTACHMENT_RULE, mimes: undefined, maxAgeMs: Number.MAX_SAFE_INTEGER }, d.now());
  if ('denied' in src) return fail('source_unavailable');
  const row = await db.file.findUnique({ where: { id: a.fileId }, select: { storageKey: true, sha256: true } });
  if (!row || (row.sha256 && row.sha256 !== a.fileDigest)) return fail('source_unavailable');
  const body = await d.storage.get(row.storageKey);
  const r = await parseIsolated(d.sandbox, body, a.name);
  if (!r.ok) return fail(r.reason);
  const ok = await db.$transaction((tx) => publishParts(tx as never, { id, revision: a.revision, fence: a.fence, kind: r.kind, parts: r.parts, imageFileId: a.fileId, now: d.now() }));
  return ok ? 'ready' : 'skipped';
}
