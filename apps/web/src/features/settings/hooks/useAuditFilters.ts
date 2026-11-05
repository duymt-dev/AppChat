// Bộ lọc Audit log / AI Audit log (TIP-045b A2): người làm · hành động (hoặc "chỉ sự kiện bảo mật") · trạng thái · khoảng ngày.
// Trạng thái UI cục bộ của mục (không lưu store chung); ngày nhập `YYYY-MM-DD` → ISO đầu ngày / đầu ngày kế tiếp theo giờ trình duyệt.
'use client';
import { useMemo, useState } from 'react';
import type { AuditStatus } from '../types';
import type { AuditFilter } from '../api';

export interface AuditFilterDraft {
  actor: string;
  action: string;
  status: '' | AuditStatus;
  from: string;
  to: string;
}

const EMPTY: AuditFilterDraft = { actor: '', action: '', status: '', from: '', to: '' };
const DAY_MS = 86_400_000;
const iso = (d: string, plusDay = false) => (d ? new Date(new Date(`${d}T00:00:00`).getTime() + (plusDay ? DAY_MS : 0)).toISOString() : undefined);

export function toAuditFilter(d: AuditFilterDraft): AuditFilter {
  return {
    ...(d.actor ? { actor: d.actor } : {}),
    ...(d.action ? { action: d.action } : {}),
    ...(d.status ? { status: d.status } : {}),
    ...(d.from ? { from: iso(d.from) } : {}),
    ...(d.to ? { to: iso(d.to, true) } : {}),
  };
}

export function useAuditFilters() {
  const [draft, setDraft] = useState<AuditFilterDraft>(EMPTY);
  const filter = useMemo(() => toAuditFilter(draft), [draft]);
  const active = Object.keys(filter).length > 0;
  return { draft, filter, active, set: (p: Partial<AuditFilterDraft>) => setDraft((d) => ({ ...d, ...p })), reset: () => setDraft(EMPTY) };
}
