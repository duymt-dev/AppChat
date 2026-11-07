// Host form + danh sách hoạt động CRM (TIP-026b §3.3) — mount MỘT lần ở CrmFormsHost; Hộp thư và Khách hàng dùng chung.
'use client';
import { useActivityUi } from './activity-store';
import { NoteForm } from './NoteForm';
import { TaskForm } from './TaskForm';
import { OpportunityForm } from './OpportunityForm';
import { ActivityListDrawer } from './ActivityListDrawer';

export function ActivityFormHost() {
  const form = useActivityUi((s) => s.form);
  return (
    <>
      <ActivityListDrawer />
      {form?.kind === 'note' || form?.kind === 'comment' ? <NoteForm key={`${form.kind}:${form.contactId}`} target={form} /> : null}
      {form?.kind === 'task' ? <TaskForm key={`t:${form.editId ?? 'new'}`} target={form} /> : null}
      {form?.kind === 'opportunity' ? <OpportunityForm key={`o:${form.editId ?? 'new'}`} target={form} /> : null}
    </>
  );
}
