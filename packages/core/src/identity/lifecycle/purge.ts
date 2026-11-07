// Purge bản sao lưu xoá đã hết hạn (TIP-041 §4, AC07). Job ngày cùng lượt quét lưu trữ. Bất biến:
//   - chỉ manifest `deletion` + `expires_at <= now` + không legal hold + chưa purge (index `archive_manifest_purge_idx`), và workspace của
//     nó đã ở `deleted` (tombstone) — bản lưu trữ vô hạn (`indefinite`) / workspace còn sống KHÔNG bao giờ bị chạm, kể cả khi dữ liệu sai.
//   - khoá trong kho kiểm hình dạng `<ws>/g<gen>-<manifest>.acar` và phải thuộc ĐÚNG workspace của manifest (không xoá đường dẫn ngoài gốc /
//     của workspace khác); xoá tệp trước rồi đánh `purged_at` (chạy lại idempotent — remove force).
//   - tệp đính kèm của workspace (kho file `<ws>/…`) chỉ dọn khi KHÔNG còn manifest nào chưa purge (gồm bản đang hold) — dọn một lần,
//     đánh `files_purged_at`.
import type { PlatformDb } from '@appchat/db';
import { assertArchiveKey } from '@appchat/db';
import type { Storage } from '../../kernel/files/storage';
import type { LifecycleInfra } from './types';

export interface PurgeDeps {
  platform: PlatformDb;
  infra: Pick<LifecycleInfra, 'store'>;
  files: Pick<Storage, 'deleteWorkspace'> | null;
  now: () => Date;
}

export interface PurgeReport {
  manifests: number;
  skipped: number;
  workspaceFiles: number;
}

const BATCH = 100;

export async function purgeExpired(d: PurgeDeps, maxBatches = 20): Promise<PurgeReport> {
  const r: PurgeReport = { manifests: 0, skipped: 0, workspaceFiles: 0 };
  const now = d.now();
  let after: string | null = null;
  for (let b = 0; b < maxBatches; b++) {
    const rows: { id: string; workspaceId: string; storageKey: string; expiresAt: Date | null }[] = await d.platform.archiveManifest.findMany({
      where: { retentionKind: 'deletion', purgedAt: null, holdReason: null, expiresAt: { lte: now }, ...(after ? { id: { gt: after } } : {}) },
      orderBy: [{ id: 'asc' }],
      take: BATCH,
      select: { id: true, workspaceId: true, storageKey: true, expiresAt: true },
    });
    if (!rows.length) break;
    after = rows.at(-1)!.id;
    const wsIds = [...new Set(rows.map((x) => x.workspaceId))];
    const deleted = new Set(
      (await d.platform.workspace.findMany({ where: { id: { in: wsIds }, dbStatus: 'deleted' }, select: { id: true } })).map((w) => w.id),
    );
    for (const m of rows) {
      // Workspace chưa tombstone (vd. lệnh xoá thất bại rồi về active) → bản sao lưu dở giữ lại, không purge theo hạn.
      if (!deleted.has(m.workspaceId) || !m.storageKey.startsWith(`${m.workspaceId}/`)) {
        r.skipped++;
        continue;
      }
      await d.infra.store.remove(assertArchiveKey(m.storageKey));
      const n = await d.platform.archiveManifest.updateMany({ where: { id: m.id, purgedAt: null, holdReason: null, retentionKind: 'deletion' }, data: { purgedAt: now } });
      r.manifests += n.count;
    }
    if (rows.length < BATCH) break;
  }
  if (d.files) r.workspaceFiles = await purgeWorkspaceFiles(d);
  return r;
}

/** Tệp của workspace đã xoá: dọn khi không còn manifest nào chưa purge (kể cả bản hold — hold giữ cả tệp liên quan). */
async function purgeWorkspaceFiles(d: PurgeDeps): Promise<number> {
  const candidates = await d.platform.workspace.findMany({
    where: { dbStatus: 'deleted', filesPurgedAt: null },
    orderBy: [{ deletedAt: 'asc' }, { id: 'asc' }],
    select: { id: true },
    take: 50,
  });
  let n = 0;
  for (const w of candidates) {
    const live = await d.platform.archiveManifest.count({ where: { workspaceId: w.id, purgedAt: null } });
    if (live) continue;
    await d.files!.deleteWorkspace(w.id);
    await d.platform.workspace.updateMany({ where: { id: w.id, dbStatus: 'deleted', filesPurgedAt: null }, data: { filesPurgedAt: d.now() } });
    n++;
  }
  return n;
}
