// Cuối tab Tổng quan: Việc cần làm · Ghi chú · Comment — prototype L2074–2092. Dữ liệu + thao tác thật (TIP-026b): thẻ dùng chung ở
// shared/contact-activities (Hộp thư và Khách hàng cùng một bản, không import chéo feature).
'use client';
import { ActivityCards } from '@/shared/contact-activities';
import type { Contact360 } from '../types';

export function ExtraCards({ c }: { c: Contact360 }) {
  return <ActivityCards contactId={c.id} a={c.activities} />;
}
