// Vòng đời workspace (TIP-041) — chỉ đọc, chỉ DB nền tảng (workspace đã lưu trữ / đang khôi phục / đã xoá không có DB tenant → không qua
// `actors.resolve` vì AuthzResolver mở DB tenant):
//   GET /v1/workspace/lifecycle        thành viên còn hiệu lực — trạng thái DB + lệnh mới nhất + cảnh báo lưu trữ + yêu cầu đóng băng (Owner)
//   GET /v1/workspace/delete-preview   CHỈ Owner — hệ quả xoá (thành viên, gói còn lại, Credit mua thêm sẽ mất, giữ 30 ngày, dữ liệu giữ lại)
//   GET /v1/admin/freeze-requests      admin nền tảng (kiểm sống) — yêu cầu đóng băng theo trạng thái, cursor (created_at, id)
// Ghi đều là action qua ActionExecutor (workspace.open / delete_challenge / delete / freeze_request, admin.workspace.freeze_decide).
import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { PLATFORM_DB, WorkspaceLifecycleReader, listFreezeRequests } from '@appchat/core';
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';
import { platformAdmin } from '../platform/admin-actor';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;

const workspaceOf = (req: IncomingMessage) => {
  const v = req.headers['x-workspace-id'];
  const ws = Array.isArray(v) ? v[0] : v;
  if (!ws || !UUID.test(ws)) throw new AppError('FORBIDDEN', 403, { workspace: 'missing' });
  return ws;
};

/** Cursor `<iso>|<uuid>` (base64url) — khoá sắp xếp ổn định của danh sách yêu cầu. */
const decodeCursor = (c: string | undefined) => {
  if (!c) return undefined;
  const [at, id] = Buffer.from(c, 'base64url').toString('utf8').split('|');
  const d = new Date(at ?? '');
  if (!id || !UUID.test(id) || Number.isNaN(d.getTime())) throw new AppError('VALIDATION_FAILED', 422, { cursor: 'invalid' });
  return { at: d, id };
};

@Controller()
export class LifecycleController {
  constructor(
    @Inject(WorkspaceLifecycleReader) private readonly reader: WorkspaceLifecycleReader,
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(PLATFORM_DB) private readonly platform: PlatformDb,
  ) {}

  @Get('workspace/lifecycle')
  async status(@Req() req: IncomingMessage) {
    const userId = await this.actors.user(req);
    return { data: await this.reader.status(userId, workspaceOf(req)) };
  }

  @Get('workspace/delete-preview')
  async deletePreview(@Req() req: IncomingMessage) {
    const userId = await this.actors.user(req);
    return { data: await this.reader.deletePreview(userId, workspaceOf(req)) };
  }

  @Get('admin/freeze-requests')
  async freezeRequests(@Req() req: IncomingMessage, @Query() q: Record<string, string | undefined>) {
    await platformAdmin(this.actors, this.platform, req);
    const status = (STATUSES as readonly string[]).includes(q.status ?? '') ? (q.status as (typeof STATUSES)[number]) : 'pending';
    const limit = Math.min(100, Math.max(1, Number(q.limit) || 25));
    const page = await listFreezeRequests(this.platform, { status, limit, cursor: decodeCursor(q.cursor) });
    return { data: page.rows, next_cursor: page.next ? Buffer.from(`${page.next.at.toISOString()}|${page.next.id}`).toString('base64url') : null };
  }
}
