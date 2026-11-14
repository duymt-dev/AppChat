// Kind `contact.export` của việc dữ liệu (TIP-045b annex D) — xuất > 5.000 khách. Đọc tập id CHỐT theo seq từng lô 1.000 (keyset), dòng
// theo quyền HIỆN TẠI của người tạo, ghép CSV rồi ghi Storage một lần (`<ws>/exports/<job>.csv`, hạn 24 giờ). Biên nhận chỉ đánh dấu khi
// tệp đã ghi xong (khách đã ra dòng → done, bị xoá / ra ngoài scope → skipped) — huỷ / lỗi giữa chừng: không có tệp, thử lại dựng lại từ đầu.
import type { TenantDb } from '@appchat/db';
import { registerDataJobKind, type KindContext } from '../../kernel/jobs/bulk-dispatch';
import { dataJobUrl } from '../../kernel/jobs/data-jobs/handlers';
import type { Storage } from '../../kernel/files/storage';
import { EXPORT_BATCH, EXPORT_TTL_MS, csvHead, csvLines, exportFileName } from '../services/contact-export';
import type { CrmMembers } from '../services/members.service';

export const CONTACT_EXPORT_KIND = 'contact.export';
const CRLF = '\r\n';

async function mark(db: TenantDb, jobId: string, ids: string[], status: 'done' | 'skipped', now: Date) {
  for (let i = 0; i < ids.length; i += EXPORT_BATCH) {
    await db.dataJobItem.updateMany({ where: { jobId, status: 'pending', targetId: { in: ids.slice(i, i + EXPORT_BATCH) } }, data: { status, updatedAt: now } });
  }
}

export function registerContactExportKind(storage: Storage, members: Pick<CrmMembers, 'names'>) {
  registerDataJobKind(CONTACT_EXPORT_KIND, {
    label: 'Xuất khách hàng',
    link: dataJobUrl,
    whole: async (c: KindContext, _l, shouldStop) => {
      const parts: string[] = [csvHead()];
      const shown: string[] = [];
      const missed: string[] = [];
      let after = -1;
      for (;;) {
        if (await shouldStop()) return { status: 'cancelled' };
        const batch = await c.db.dataJobItem.findMany({ where: { jobId: c.job.id, seq: { gt: after } }, orderBy: { seq: 'asc' }, take: EXPORT_BATCH, select: { seq: true, targetId: true } });
        if (!batch.length) break;
        const r = await csvLines(c.db, c.authz, members, batch.map((b) => b.targetId));
        parts.push(...r.lines);
        const seen = new Set(r.ids);
        for (const b of batch) (seen.has(b.targetId) ? shown : missed).push(b.targetId);
        after = batch.at(-1)!.seq;
      }
      const now = c.now();
      const fileKey = `${c.ws}/exports/${c.job.id}.csv`;
      await storage.put(fileKey, Buffer.from(parts.join(CRLF), 'utf8'));
      await mark(c.db, c.job.id, shown, 'done', now);
      await mark(c.db, c.job.id, missed, 'skipped', now);
      return { status: 'completed', fileKey, fileName: exportFileName(now), expiresAt: new Date(now.getTime() + EXPORT_TTL_MS) };
    },
  });
}
