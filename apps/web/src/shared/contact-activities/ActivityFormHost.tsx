// Host form + danh sách hoạt động CRM (TIP-026b §3.3) — mount MỘT lần ở CrmFormsHost; Hộp thư và Khách hàng dùng chung. Cơ hội: drawer
// Cơ hội 360° (TIP-026c) mount ở đây — thêm nhanh nằm trong thẻ 360°, không còn form cơ hội riêng.
'use client';
import { useActivityUi } from './activity-store';
import { NoteForm } from './NoteForm';
import { TaskForm } from './TaskForm';
import { ActivityListDrawer } from './ActivityListDrawer';
import { OpportunityDrawer } from '../opportunities';

export function ActivityFormHost() {
  const form = useActivityUi((s) => s.form);
  return (
    <>
      <ActivityListDrawer />
      <OpportunityDrawer />
      {form?.kind === 'note' || form?.kind === 'comment' ? <NoteForm key={`${form.kind}:${form.contactId}`} target={form} /> : null}
      {form?.kind === 'task' ? <TaskForm key={`t:${form.editId ?? 'new'}`} target={form} /> : null}
    </>
  );
}
