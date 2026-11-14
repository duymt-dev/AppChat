// Chip cơ hội của Hộp thư (TIP-026c §5.2) — như `inbox/services/view.ts`: tóm tắt cơ hội mở của khách (openSummary) gắn vào hội thoại.
// Fixture prototype trỏ mọi hội thoại 1-1 về hồ sơ mẫu ct_lan (dùng chung một nội dung 360°), nhưng prototype chỉ vẽ chip ở hội thoại
// chị Lan (L1978 / L2064) — mock chỉ gắn cho hội thoại có khách là chủ hồ sơ thật (c_lan), không nhân bản chip mẫu cho mọi dòng.
import { openSummaryOf } from './contact-opportunities';
import type { MockRoute } from '../routes';

type Db = Parameters<MockRoute>[0];
const OWNER: Record<string, string> = { c_lan: 'ct_lan' };

export const withOpportunityChip = <T extends { id: string } | null>(db: Db, c: T): T => {
  const contactId = c ? OWNER[c.id] : undefined;
  const chip = contactId ? openSummaryOf(db.customers.activities.pipeline, db.role, contactId) : undefined;
  return chip ? { ...c, opportunity_chip: chip } : c;
};
