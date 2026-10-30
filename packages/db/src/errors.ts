// Lỗi của lớp DB. Kernel (TIP-003) map sang envelope: WORKSPACE_UNAVAILABLE 503 / 423, NOT_FOUND 404.
import type { DbStatus } from './registry';

export class TenantContextError extends Error {
  constructor(message = 'Thiếu TenantContext đã xác thực') {
    super(message);
    this.name = 'TenantContextError';
  }
}

export class WorkspaceUnavailableError extends Error {
  readonly code = 'WORKSPACE_UNAVAILABLE';
  readonly httpStatus: 503 | 423;

  constructor(
    readonly workspaceId: string,
    readonly dbStatus: DbStatus,
  ) {
    super(`Workspace chưa sẵn sàng (${dbStatus})`);
    this.name = 'WorkspaceUnavailableError';
    this.httpStatus = dbStatus === 'provisioning' || dbStatus === 'restoring' ? 503 : 423;
  }
}

export class WorkspaceNotFoundError extends Error {
  readonly code = 'NOT_FOUND';

  constructor(readonly workspaceId: string) {
    super('Không tìm thấy workspace');
    this.name = 'WorkspaceNotFoundError';
  }
}
