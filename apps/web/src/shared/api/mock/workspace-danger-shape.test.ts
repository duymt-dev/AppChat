// Mock vùng nguy hiểm (TIP-041 P3) trả đúng hợp đồng chung + luật: chỉ Owner; xoá cần đúng tên → mã → sai mã báo `invalid`, mã đúng đưa
// phiên sang `deleting`; yêu cầu đóng băng một chờ mỗi workspace; admin duyệt CAS phiên bản → tạm dừng.
import { afterEach, describe, expect, it } from 'vitest';
import { ApiRequestError, freezeRequestRowSchema, workspaceDeletePreviewSchema, workspaceLifecycleSchema } from '@appchat/shared';
import { MOCK_DELETE_OTP, resetDangerMock } from './domains/workspace-danger';
import { mockTransport } from './mock-transport';
import { mockDb } from './store';

const fail = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return (e as ApiRequestError).error;
  }
  throw new Error('expected failure');
};
const result = <T,>(r: { data: unknown }) => (r.data as { result: T }).result;

describe('mock workspace danger zone', () => {
  afterEach(() => {
    resetDangerMock();
    const db = mockDb();
    db.role = 'owner';
    db.session.lifecycle = null;
  });

  it('preview đúng schema; không phải Owner → 403', async () => {
    const db = mockDb();
    db.role = 'owner';
    expect(workspaceDeletePreviewSchema.safeParse(await mockTransport.get('/workspace/delete-preview')).success).toBe(true);
    db.role = 'manager';
    expect((await fail(mockTransport.get('/workspace/delete-preview'))).code).toBe('FORBIDDEN');
  });

  it('tên sai → mismatch; mã sai → invalid; mã đúng → deleting', async () => {
    const db = mockDb();
    db.role = 'owner';
    expect((await fail(mockTransport.action('workspace.delete_challenge', { confirm_name: 'sai tên' }))).fields).toMatchObject({ confirm_name: 'mismatch' });
    const c = result<{ challenge_id: string }>(await mockTransport.action('workspace.delete_challenge', { confirm_name: db.settings.workspace.name }));
    expect((await fail(mockTransport.action('workspace.delete', { challenge_id: c.challenge_id, otp: '000000', acknowledge_loss: true }))).fields).toMatchObject({ otp: 'invalid' });
    const d = result<{ db_status: string }>(await mockTransport.action('workspace.delete', { challenge_id: c.challenge_id, otp: MOCK_DELETE_OTP, acknowledge_loss: true }));
    expect(d.db_status).toBe('deleting');
    expect(db.session.lifecycle).toBe('deleting');
    expect(workspaceLifecycleSchema.parse(await mockTransport.get('/workspace/lifecycle')).db_status).toBe('deleting');
  });

  it('đóng băng: một yêu cầu chờ; admin duyệt CAS → approved + workspace tạm dừng', async () => {
    const db = mockDb();
    db.role = 'owner';
    await mockTransport.action('workspace.freeze_request', { reason: 'Tạm nghỉ 2 tháng' });
    expect((await fail(mockTransport.action('workspace.freeze_request', { reason: 'Lần nữa' }))).code).toBe('CONFLICT');
    expect(workspaceLifecycleSchema.parse(await mockTransport.get('/workspace/lifecycle')).freeze_request?.status).toBe('pending');
    const page = (await mockTransport.get('/admin/freeze-requests', { status: 'pending' })) as { data: unknown[] };
    const row = freezeRequestRowSchema.parse(page.data[0]);
    expect((await fail(mockTransport.action('admin.workspace.freeze_decide', { request_id: row.id, if_version: 9, decision: 'approve', reason: 'ok ok' }))).code).toBe('CONFLICT');
    const r = result<{ status: string }>(await mockTransport.action('admin.workspace.freeze_decide', { request_id: row.id, if_version: row.version, decision: 'approve', reason: 'Owner xác nhận' }));
    expect(r.status).toBe('approved');
    expect(db.platformAdmin.workspaces[0]?.status).toBe('suspended');
  });
});
