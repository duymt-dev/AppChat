// Đọc Hộp thư (Blueprint §4.4 inbox, TIP-016 — shape packages/shared/src/api/inbox.ts): /v1/conversations (cursor),
// /conversations/counts, /conversations/:id, /conversations/:id/messages (cursor), /conversations/:id/messages/search.
// Quyền `inbox.view`; scope inbox áp trong service. Ghi qua action conversation.* / message.* / note.add.
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { InboxReadService, type ConvFilter } from '@appchat/core';
import { AppError, INBOX_FOLDERS, INBOX_SORTS, type InboxFolder, type InboxSort } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const int = (v: string | undefined, field: string) => {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new AppError('VALIDATION_FAILED', 400, { [field]: 'invalid' });
  return n;
};

@Controller('conversations')
export class ConversationsController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(InboxReadService) private readonly read: InboxReadService,
  ) {}

  private async viewer(req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('inbox.view')) throw new AppError('FORBIDDEN', 403, { permission: 'inbox.view' });
    return a;
  }

  @Get()
  async list(@Req() req: IncomingMessage, @Query() q: Record<string, string | undefined>) {
    const v = await this.viewer(req);
    const folder = (q.folder ?? 'all') as InboxFolder;
    if (!INBOX_FOLDERS.includes(folder)) throw new AppError('VALIDATION_FAILED', 400, { folder: 'invalid' });
    // Khoá sắp xếp khác của FE (ưu tiên / VIP / SLA — chưa có dữ liệu) = mới nhất.
    const sort: InboxSort = INBOX_SORTS.includes(q.sort as InboxSort) ? (q.sort as InboxSort) : 'latest';
    const f: ConvFilter = { folder, channel: q.channel || undefined, channelAccountId: q.channel_account_id || undefined, tagId: q.tag_id, q: q.q?.slice(0, 100), sort };
    return this.read.list(v, f, q.cursor, int(q.limit, 'limit'));
  }

  @Get('counts')
  async counts(@Req() req: IncomingMessage) {
    return { data: await this.read.counts(await this.viewer(req)) };
  }

  @Get(':id')
  async get(@Req() req: IncomingMessage, @Param('id') id: string) {
    return { data: await this.read.get(await this.viewer(req), id) };
  }

  @Get(':id/messages')
  async messages(@Req() req: IncomingMessage, @Param('id') id: string, @Query('cursor') cursor?: string) {
    return this.read.messages(await this.viewer(req), id, cursor);
  }

  @Get(':id/messages/search')
  async search(@Req() req: IncomingMessage, @Param('id') id: string, @Query('q') q?: string, @Query('sender') sender?: string) {
    return { data: await this.read.search(await this.viewer(req), id, q ?? '', sender ?? 'all') };
  }
}
