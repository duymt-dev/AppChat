// Socket.IO namespace `/ws` (Blueprint §4.6) gắn vào HTTP server của Nest + Redis adapter (fan-out nhiều node API).
// Handshake JWT + workspace → room `ws:{id}` + `user:{id}`; client → server: `conv.join` / `conv.leave` / `typing` /
// `presence.list` (ack `{ data } | { error }`). Worker phát `RT_EVENT` qua redis-emitter → mỗi node lọc socket của mình theo
// quyền (allowedFor) rồi mới emit (outbox §8).
import { Inject, type BeforeApplicationShutdown, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Server as HttpServer } from 'node:http';
import type { Redis } from 'ioredis';
import { Server, type Namespace, type Socket } from 'socket.io';
import { z } from 'zod';
import { AppError, can } from '@appchat/shared';
import {
  AuthzResolver,
  LOGGER,
  REDIS,
  RT_EVENT,
  WS_NAMESPACE,
  WorkspacesService,
  allowedFor,
  conversationGuard,
  rooms,
  type AppLogger,
  type RealtimeEnvelope,
  type SocketIdentity,
} from '@appchat/core';
import { ACTOR_RESOLVER, type ActorResolver } from '../../kernel/request-actor';
import { authenticate, connectError } from './ws.auth';

type Ack = (r: { data: unknown } | { error: { code: string } }) => void;
const convInput = z.object({ conversation_id: z.uuid() });
const typingInput = convInput.extend({ typing: z.boolean().default(true) });
const fail = (ack: unknown, code: string) => void (typeof ack === 'function' && (ack as Ack)({ error: { code } }));
const ok = (ack: unknown, data: unknown) => void (typeof ack === 'function' && (ack as Ack)({ data }));
const who = (s: { data: unknown }) => s.data as SocketIdentity;

export class RealtimeGateway implements OnApplicationBootstrap, BeforeApplicationShutdown, OnApplicationShutdown {
  private io?: Server;
  private nsp?: Namespace;
  private clients: Redis[] = [];

  constructor(
    @Inject(HttpAdapterHost) private readonly host: HttpAdapterHost,
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(WorkspacesService) private readonly workspaces: WorkspacesService,
    @Inject(AuthzResolver) private readonly authz: AuthzResolver,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  onApplicationBootstrap(): void {
    const http = this.host.httpAdapter.getHttpServer() as HttpServer;
    const pub = this.redis.duplicate();
    const sub = this.redis.duplicate();
    this.clients = [pub, sub];
    this.io = new Server(http, { serveClient: false, adapter: createAdapter(pub, sub) });
    const nsp = (this.nsp = this.io.of(WS_NAMESPACE));
    nsp.use((socket, next) => {
      authenticate(this.actors, socket.handshake)
        .then((id) => {
          socket.data = id;
          next();
        })
        .catch((err: unknown) => next(connectError(err)));
    });
    nsp.on('connection', (s) => this.onConnection(s));
    nsp.on(RT_EVENT, (env: RealtimeEnvelope) => {
      this.deliver(env).catch((err: unknown) => this.log.warn({ err, event: env.event }, 'realtime deliver lỗi'));
    });
  }

  private onConnection(s: Socket): void {
    const me = who(s);
    void s.join([rooms.ws(me.workspaceId), rooms.user(me.userId)]);
    s.to(rooms.ws(me.workspaceId)).emit('presence', { user_id: me.userId, online: true });
    s.on('conv.join', (p: unknown, ack: unknown) => void this.join(s, p, ack));
    s.on('conv.leave', (p: unknown, ack: unknown) => {
      const r = convInput.safeParse(p);
      if (!r.success) return fail(ack, 'VALIDATION_FAILED');
      void s.leave(rooms.conv(r.data.conversation_id));
      return ok(ack, { ok: true });
    });
    s.on('typing', (p: unknown, ack: unknown) => {
      const r = typingInput.safeParse(p);
      if (!r.success) return fail(ack, 'VALIDATION_FAILED');
      const room = rooms.conv(r.data.conversation_id);
      if (!s.rooms.has(room)) return fail(ack, 'FORBIDDEN');
      s.to(room).emit('typing', { conversation_id: r.data.conversation_id, user_id: me.userId, typing: r.data.typing });
      return ok(ack, { ok: true });
    });
    s.on('presence.list', (_p: unknown, ack: unknown) => {
      this.online(me.workspaceId)
        .then((ids) => ok(ack, { user_ids: ids }))
        .catch(() => fail(ack, 'INTERNAL'));
    });
    s.on('disconnect', () => void this.maybeOffline(me));
  }

  private async join(s: Socket, p: unknown, ack: unknown): Promise<void> {
    const r = convInput.safeParse(p);
    if (!r.success) return fail(ack, 'VALIDATION_FAILED');
    const me = who(s);
    if (!can(me.authz, 'inbox.view')) return fail(ack, 'FORBIDDEN');
    const guard = conversationGuard();
    if (!guard) return fail(ack, 'NOT_IMPLEMENTED');
    try {
      if (!(await guard({ ...me, conversationId: r.data.conversation_id }))) return fail(ack, 'SCOPE_FORBIDDEN');
    } catch (err) {
      return fail(ack, err instanceof AppError ? err.code : 'INTERNAL');
    }
    await s.join(rooms.conv(r.data.conversation_id));
    return ok(ack, { ok: true });
  }

  /** User đang online trong workspace (mọi node — fetchSockets qua Redis adapter). */
  private async online(workspaceId: string): Promise<string[]> {
    const socks = await this.nsp!.in(rooms.ws(workspaceId)).fetchSockets();
    return [...new Set(socks.map((x) => who(x).userId))].sort();
  }

  private async maybeOffline(me: SocketIdentity): Promise<void> {
    const left = await this.nsp!.in(rooms.user(me.userId)).fetchSockets().catch(() => []);
    if (left.some((x) => who(x).workspaceId === me.workspaceId)) return;
    this.nsp!.to(rooms.ws(me.workspaceId)).emit('presence', { user_id: me.userId, online: false });
  }

  /** Socket CỦA NODE NÀY trong các phòng của envelope → lệnh control → lọc quyền → emit. */
  private async deliver(env: RealtimeEnvelope): Promise<void> {
    const nsp = this.nsp!;
    const c = env.control;
    if (c) {
      for (const id of nsp.adapter.rooms.get(rooms.user(c.userId)) ?? []) {
        const s = nsp.sockets.get(id);
        if (!s || who(s).workspaceId !== env.ws) continue;
        if (c.type === 'disconnect') {
          s.emit(env.event, env.data);
          s.disconnect(true);
          continue;
        }
        const m = await this.workspaces.membership(c.userId, env.ws);
        if (!m) {
          s.disconnect(true);
          continue;
        }
        s.data = { ...who(s), authz: await this.authz.resolve(env.ws, c.userId, m) } satisfies SocketIdentity;
      }
    }
    const ids = new Set(env.rooms.flatMap((r) => [...(nsp.adapter.rooms.get(r) ?? [])]));
    for (const id of ids) {
      const s = nsp.sockets.get(id);
      if (s && allowedFor(who(s), env)) s.emit(env.event, env.data);
    }
  }

  beforeApplicationShutdown(): void {
    // Đóng socket trước khi Nest đóng HTTP server (kết nối WS giữ server.close không xong).
    this.io?.of(WS_NAMESPACE).local.disconnectSockets(true);
    this.io?.engine.close();
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all(this.clients.map((c) => c.quit().catch(() => undefined)));
  }
}
