// Chạy xuất danh sách (TIP-038 pha 3): một nơi cho cả đường ngay (≤ 50 dòng, trong action) và việc nền (`data_job`, ROLE=jobs). Dòng dựng
// theo lô 1.000 id của tập CHỐT (keyset seq) dưới quyền HIỆN TẠI của người xuất; ghi Storage một lần (`<ws>/exports/<job>.xlsx`, hạn 24 giờ);
// biên nhận chỉ đánh dấu khi tệp đã ghi (đã ra dòng → done, xoá / ra ngoài scope → skipped). Dấu quyền (vai trò trường + phiên bản định
// nghĩa + scope module + nhóm) ghi vào việc: tải lại khi dấu khác → 410 (kernel bulk-status) — scope thu hẹp sau khi xuất không phát tệp cũ.
import { serverMessages, type AuthzContext, type ListExportKind, type ScopeModule } from '@appchat/shared';
import type { PlatformDb, TenantDb } from '@appchat/db';
import { fieldRoleOf } from '@appchat/shared';
import { liveDefs } from '../../authz/public';
import { registerDataJobKind, type KindContext } from '../../kernel/jobs/bulk-dispatch';
import { registerExportStamp } from '../../kernel/jobs/bulk-status';
import { dataJobUrl } from '../../kernel/jobs/data-jobs/handlers';
import type { Storage } from '../../kernel/files/storage';
import { exportCustomKeys, withCustom, workbook } from './export-columns';
import { contractReader, orderReader, quoteReader } from './sales-readers';
import { ticketReader } from './ticket-reader';
import type { Cell, ExportDb, ExportPlace, ListReader } from './types';

export const EXPORT_BATCH = 1000;
export const EXPORT_TTL_MS = 24 * 60 * 60_000;

export const READERS: Record<ListExportKind, ListReader<unknown>> = {
  'quote.export': quoteReader as ListReader<unknown>,
  'order.export': orderReader as ListReader<unknown>,
  'contract.export': contractReader as ListReader<unknown>,
  'ticket.export': ticketReader as ListReader<unknown>,
};
const MODULE: Record<ListExportKind, ScopeModule> = {
  'quote.export': 'sales',
  'order.export': 'sales',
  'contract.export': 'sales',
  'ticket.export': 'support',
};

/** Dấu quyền của tệp: đổi vai trò trường / định nghĩa trường / scope đọc của module / nhóm → tệp cũ không tải nữa. */
export async function exportStamp(
  db: Pick<ExportDb, 'customFieldDef'>,
  kind: ListExportKind,
  a: AuthzContext,
): Promise<string> {
  const entity = READERS[kind].entity;
  const defs = entity ? (await liveDefs(db, entity)).version : '-';
  const scope = a.isOwner ? 'all' : (a.scope[MODULE[kind]] ?? 'none');
  return `${fieldRoleOf(a)}|${defs}|${scope}|${[...a.teamIds].sort().join(',')}`;
}
for (const kind of Object.keys(READERS) as ListExportKind[])
  registerExportStamp(kind, (db, a) => exportStamp(db, kind, a));

export const exportFileName = (kind: ListExportKind, locale: string, now: Date) =>
  `${serverMessages(locale).insights.export.file[kind]}-${now.toISOString().slice(0, 10)}.xlsx`;

/** Giờ workspace + ngôn ngữ người xuất + tên người (nền tảng). */
export async function exportPlace(
  platform: Pick<PlatformDb, 'workspace' | 'user'> | null,
  ws: string,
  userId: string | null,
): Promise<Omit<ExportPlace, 'custom'>> {
  const [w, u] = platform
    ? await Promise.all([
        platform.workspace.findUnique({ where: { id: ws }, select: { timezone: true } }),
        userId ? platform.user.findUnique({ where: { id: userId }, select: { locale: true } }) : null,
      ])
    : [null, null];
  return {
    timeZone: w?.timezone ?? 'Asia/Ho_Chi_Minh',
    locale: u?.locale === 'en' ? 'en' : 'vi',
    names: async (ids) => {
      const want = [...new Set(ids.filter((x): x is string => !!x))];
      if (!platform || !want.length) return new Map();
      const rows = await platform.user.findMany({
        where: { id: { in: want } },
        select: { id: true, name: true, email: true },
      });
      return new Map(rows.map((r) => [r.id, r.name || r.email]));
    },
  };
}

type Batches = (after: number) => Promise<{ seq: number; targetId: string }[]>;

/** Dựng tệp từ các lô id chốt; `shouldStop` để huỷ hợp tác giữa các lô. */
export async function buildExport(
  db: ExportDb,
  kind: ListExportKind,
  a: AuthzContext,
  base: Omit<ExportPlace, 'custom'>,
  now: Date,
  next: Batches,
  shouldStop?: () => Promise<boolean>,
) {
  const reader = READERS[kind];
  const place: ExportPlace = { ...base, custom: await exportCustomKeys(db, reader.entity, a) };
  const m = serverMessages(place.locale).insights.export;
  const shown: string[] = [];
  const missed: string[] = [];
  let stopped = false;
  async function* rows(): AsyncIterable<Cell[][]> {
    for (let after = -1; ;) {
      if (shouldStop && (await shouldStop())) return void (stopped = true);
      const batch = await next(after);
      if (!batch.length) return;
      const r = await reader.rows(
        db,
        a,
        batch.map((b) => b.targetId),
        place,
        now,
      );
      const seen = new Set(r.ids);
      for (const b of batch) (seen.has(b.targetId) ? shown : missed).push(b.targetId);
      after = batch.at(-1)!.seq;
      yield r.rows;
    }
  }
  const body = await workbook(
    m.sheet[kind],
    `${m.sheet[kind]} · ${place.timeZone}`,
    withCustom(reader.columns(m), place.custom),
    rows(),
  );
  return { body, shown, missed, stopped, fileName: exportFileName(kind, place.locale, now) };
}

async function mark(
  db: Pick<TenantDb, 'dataJobItem'>,
  jobId: string,
  ids: string[],
  status: 'done' | 'skipped',
  now: Date,
) {
  for (let i = 0; i < ids.length; i += EXPORT_BATCH) {
    await db.dataJobItem.updateMany({
      where: { jobId, status: 'pending', targetId: { in: ids.slice(i, i + EXPORT_BATCH) } },
      data: { status, updatedAt: now },
    });
  }
}

/** Ghi tệp + biên nhận (dùng chung đường ngay và việc nền) — trả key / tên / hạn để kết thúc việc. */
export async function storeExport(
  db: Pick<TenantDb, 'dataJobItem'>,
  storage: Storage,
  ws: string,
  jobId: string,
  built: Awaited<ReturnType<typeof buildExport>>,
  now: Date,
) {
  const fileKey = `${ws}/exports/${jobId}.xlsx`;
  await storage.put(fileKey, built.body);
  await mark(db, jobId, built.shown, 'done', now);
  await mark(db, jobId, built.missed, 'skipped', now);
  return { fileKey, fileName: built.fileName, expiresAt: new Date(now.getTime() + EXPORT_TTL_MS) };
}

export const itemBatches =
  (db: Pick<TenantDb, 'dataJobItem'>, jobId: string): Batches =>
  (after) =>
    db.dataJobItem.findMany({
      where: { jobId, seq: { gt: after } },
      orderBy: { seq: 'asc' },
      take: EXPORT_BATCH,
      select: { seq: true, targetId: true },
    });

/** Kind việc nền cho 4 danh sách (ROLE=jobs): dựng dưới quyền hiện tại, cập nhật dấu quyền theo quyền lúc dựng (tệp khớp quyền hiện tại). */
export function registerListExportKinds(
  storage: Storage,
  platform: Pick<PlatformDb, 'workspace' | 'user'> | null,
) {
  for (const kind of Object.keys(READERS) as ListExportKind[]) {
    registerDataJobKind(kind, {
      label: serverMessages('vi').insights.export.sheet[kind],
      link: dataJobUrl,
      whole: async (c: KindContext, _l, shouldStop) => {
        const now = c.now();
        const built = await buildExport(
          c.db as unknown as ExportDb,
          kind,
          c.authz,
          await exportPlace(platform, c.ws, c.job.actorId),
          now,
          itemBatches(c.db, c.job.id),
          shouldStop,
        );
        if (built.stopped) return { status: 'cancelled' };
        const file = await storeExport(c.db, storage, c.ws, c.job.id, built, now);
        await c.db.dataJob.update({
          where: { id: c.job.id },
          data: { fieldPolicy: await exportStamp(c.db as unknown as ExportDb, kind, c.authz) },
        });
        return { status: 'completed', ...file };
      },
    });
  }
}
