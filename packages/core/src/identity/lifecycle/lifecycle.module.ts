// Vòng đời workspace (TIP-041): handler admin.workspace.archive / restore + workspace.open (API + worker — registry cần đủ handler ở mọi tiến trình) + cấu
// hình hạ tầng / tín hiệu đánh thức. Chỉ phụ thuộc kernel / platform public — không import IdentityModule (không vòng DI).
import { Module } from '@nestjs/common';
import { AdminWorkspaceArchiveHandler, AdminWorkspaceRestoreHandler } from './actions';
import { WorkspaceOpenHandler } from './restore-request';
import { WorkspaceLifecycleReader } from './status';
import { LIFECYCLE_PROVIDERS } from './lifecycle.providers';
import { LIFECYCLE_INFRA, LIFECYCLE_QUEUE } from './types';

@Module({ providers: [...LIFECYCLE_PROVIDERS, AdminWorkspaceArchiveHandler, AdminWorkspaceRestoreHandler, WorkspaceOpenHandler, WorkspaceLifecycleReader], exports: [LIFECYCLE_INFRA, LIFECYCLE_QUEUE, WorkspaceLifecycleReader] })
export class LifecycleModule {}
