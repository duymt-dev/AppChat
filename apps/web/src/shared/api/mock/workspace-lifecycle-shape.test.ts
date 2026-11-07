// Mock vòng đời workspace (TIP-041 pha 2) trả đúng hợp đồng chung: workspace.open trên workspace đã lưu trữ → restoring + mã lệnh; mở lại
// gộp cùng lệnh; GET /workspace/lifecycle parse được bằng schema shared và đi tới active.
import { describe, expect, it } from 'vitest';
import { workspaceLifecycleSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { mockDb } from './store';

describe('mock workspace lifecycle', () => {
  it('archived → workspace.open → restoring (gộp lệnh) → poll tới active', async () => {
    const db = mockDb();
    db.session.lifecycle = 'archived';
    const a = await mockTransport.action<{ db_status: string; restore_job_id: string | null }>('workspace.open', {});
    expect(a.status).toBe(200);
    const r1 = (a.data as { result: { db_status: string; restore_job_id: string | null } }).result;
    expect(r1).toMatchObject({ db_status: 'restoring', restore_job_id: expect.any(String) });
    const b = await mockTransport.action('workspace.open', {});
    expect((b.data as { result: { restore_job_id: string } }).result.restore_job_id).toBe(r1.restore_job_id);
    let last = '';
    for (let i = 0; i < 10 && last !== 'active'; i++) last = workspaceLifecycleSchema.parse(await mockTransport.get('/workspace/lifecycle')).db_status;
    expect(last).toBe('active');
    expect(db.session.lifecycle).toBeNull();
  });
});
