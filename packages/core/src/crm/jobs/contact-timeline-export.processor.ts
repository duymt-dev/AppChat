// Kind `contact.history_export` của việc dữ liệu (TIP-025b §D.6) — xuất lịch sử một khách > 5.000 sự kiện. Đọc tập id CHỐT theo seq từng
// lô 1.000 (keyset), dựng dòng dưới quyền HIỆN TẠI của người tạo (không còn thấy khách → huỷ, không ghi tệp), ghi Storage một lần
// (`<ws>/exports/<job>.csv`, hạn 24 giờ). Dấu quyền tệp = scope crm + vẫn thấy khách — đổi thì route tải trả 410.
import type { TenantDb } from '@appchat/db';
import { registerDataJobKind, type KindContext } from '../../kernel/jobs/bulk-dispatch';
import { registerExportStamp } from '../../kernel/jobs/bulk-status';
import { dataJobUrl } from '../../kernel/jobs/data-jobs/handlers';
import type { Storage } from '../../kernel/files/storage';
import { accessOf } from '../services/access';
import { EXPORT_BATCH, EXPORT_TTL_MS } from '../services/contact-export';
import { TIMELINE_COLUMNS, timelineHead, timelineLines, timelineStamp, type TimelineColumn } from '../services/contact-timeline-export';
import type { CrmMembers } from '../services/members.service';

export const TIMELINE_EXPORT_KIND = 'contact.history_export';
const CRLF = '\r\n';

/** Input lưu trong việc: bộ lọc + cột + giờ / ngôn ngữ chốt lúc nhận lệnh + tên tệp. */
export interface TimelineJobInput {
  contact_id: string;
  columns?: TimelineColumn[];
  time_zone: string;
  locale: string;
  file_name: string;
}

async function stillSees(db: TenantDb, c: KindContext['authz'], contactId: string) {
  const k = await db.contact.findUnique({ where: { id: contactId } });
  return !!k && !k.deletedAt && !!(await accessOf(db, c, k));
}

registerExportStamp(TIMELINE_EXPORT_KIND, async (db, a, job) => {
  const id = (job.input as { contact_id?: string } | null)?.contact_id ?? '';
  return (await stillSees(db, a, id)) ? timelineStamp(a) : 'revoked';
});

export function registerTimelineExportKind(storage: Storage, members: Pick<CrmMembers, 'names'>) {
  registerDataJobKind(TIMELINE_EXPORT_KIND, {
    label: 'Xuất lịch sử khách',
    link: dataJobUrl,
    whole: async (c: KindContext, _l, shouldStop) => {
      const i = c.job.input as unknown as TimelineJobInput;
      if (!(await stillSees(c.db, c.authz, i.contact_id))) return { status: 'cancelled' };
      const cols = i.columns ?? [...TIMELINE_COLUMNS];
      const parts: string[] = [timelineHead(cols, i.locale, i.time_zone)];
      let after = -1;
      for (;;) {
        if (await shouldStop()) return { status: 'cancelled' };
        const batch = await c.db.dataJobItem.findMany({ where: { jobId: c.job.id, seq: { gt: after } }, orderBy: { seq: 'asc' }, take: EXPORT_BATCH, select: { seq: true, targetId: true } });
        if (!batch.length) break;
        parts.push(...(await timelineLines(c.db, i.contact_id, batch.map((b) => b.targetId), { cols, locale: i.locale, timeZone: i.time_zone, members })).lines);
        after = batch.at(-1)!.seq;
      }
      const now = c.now();
      const fileKey = `${c.ws}/exports/${c.job.id}.csv`;
      await storage.put(fileKey, Buffer.from(parts.join(CRLF), 'utf8'));
      await c.db.dataJobItem.updateMany({ where: { jobId: c.job.id, status: 'pending' }, data: { status: 'done', updatedAt: now } });
      return { status: 'completed', fileKey, fileName: i.file_name, expiresAt: new Date(now.getTime() + EXPORT_TTL_MS) };
    },
  });
}
