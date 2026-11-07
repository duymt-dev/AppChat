// Mock vòng đời workspace (TIP-041 pha 2) cùng luật server: `workspace.open` trên workspace đã lưu trữ → lệnh khôi phục (nguồn member,
// gộp nếu đang chờ / chạy); `GET /workspace/lifecycle` đi qua các bước khôi phục mỗi lần poll rồi về active. Seed `?session=…,archived`.
import type { WorkspaceLifecycleDto } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockDb } from '../store';
import { latestFreeze } from './workspace-danger';

const STEPS = ['queued', 'create', 'restore', 'migrate', 'checks', 'done'] as const;
const JOB_ID = '0190f000-0000-7000-8000-00000000a041';
let step = -1;

const wsId = (db: MockDb) => db.shell.me.current_workspace_id ?? 'mock-ws';

export const workspaceLifecycleHandlers: Record<string, MockHandler> = {
  'workspace.open': {
    execute: (db) => {
      const s = db.session.lifecycle ?? null;
      if (s === 'archived') {
        db.session.lifecycle = 'restoring';
        step = 0;
      }
      const restoring = db.session.lifecycle === 'restoring';
      return { workspace_id: wsId(db), db_status: db.session.lifecycle ?? 'active', restore_job_id: restoring ? JOB_ID : null };
    },
  },
};

export const workspaceLifecycleRoutes: Record<string, (db: MockDb) => WorkspaceLifecycleDto> = {
  '/workspace/lifecycle': (db) => {
    const s = db.session.lifecycle ?? null;
    if (s === 'restoring') {
      step = Math.min(step + 1, STEPS.length - 1);
      if (STEPS[step] === 'done') db.session.lifecycle = null;
    }
    const status = db.session.lifecycle ?? 'active';
    if (status === 'deleting') return { workspace_id: wsId(db), db_status: status, job: { id: '0190f000-0000-7000-8000-00000000d042', operation: 'delete', status: 'running', step: 'backup', attempts: 1, error: null }, archive_on: null };
    const job = step >= 0 ? { id: JOB_ID, operation: 'restore' as const, status: status === 'active' ? ('succeeded' as const) : ('running' as const), step: STEPS[step]!, attempts: 1, error: null } : null;
    return { workspace_id: wsId(db), db_status: status, job, archive_on: null, freeze_request: latestFreeze(db) };
  },
};
