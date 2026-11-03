// SSE lượt Trợ lý (TIP-023c 6a, SPEC vận hành): GET /v1/assistant/runs/:id/stream?cursor= (Accept: text/event-stream) — nối lại sau khi
// rớt mạng. Kiểm run là lượt của người gọi (replay → 404 nếu không) → đường ống chung `run-stream.ts` (replay sau cursor đã ký + subscribe).
import { Controller, Get, Inject, Param, Query, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Redis } from 'ioredis';
import { AssistantService, REDIS, RequestContext } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';
import { pipeRunStream } from './run-stream';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller('assistant/runs')
export class AssistantStreamController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(AssistantService) private readonly svc: AssistantService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Get(':id/stream')
  async stream(@Req() req: IncomingMessage, @Res() res: ServerResponse, @Param('id') id: string, @Query('cursor') cursor?: string) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('assistant.use')) throw new AppError('FORBIDDEN', 403, { permission: 'assistant.use' });
    if (!UUID.test(id)) throw new AppError('NOT_FOUND', 404, { run_id: 'not_found' });
    RequestContext.patch({ ws: a.workspaceId, userId: a.userId });
    await pipeRunStream(this.svc, this.redis, req, res, a, id, cursor);
  }
}
