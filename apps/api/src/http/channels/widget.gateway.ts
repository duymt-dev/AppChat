// Socket.IO namespace `/widget` (TIP-017, Blueprint §4.6): khách web nối từ trang nhúng (widget.js). Gắn vào CÙNG server Socket.IO
// với `/ws` (registerNamespace — chung Redis adapter → worker phát `message.new` qua redis-emitter tới phòng khách web).
// Handshake `auth: { public_key, visitor_token? }` + header Origin → VisitorService.connect; client → server `visitor.hello`,
// `message.send` (ack `{ data } | { error: { code, fields? } }`). Lỗi handshake → `connect_error` `data: { code }`.
import { Inject, Optional, type BeforeApplicationShutdown, type OnModuleDestroy } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import { ZodError } from 'zod';
import { LOGGER, VisitorService, visitorRoom, type AppLogger, type WidgetSession } from '@appchat/core';
import { AppError, WIDGET_NAMESPACE } from '@appchat/shared';
import { registerNamespace, unregisterNamespace, type NamespaceInstaller } from '../notify/realtime/ws.gateway';

type Ack = (r: { data: unknown } | { error: { code: string; fields?: Record<string, string> } }) => void;

const ipOf = (s: Socket): string => {
  const xf = s.handshake.headers['x-forwarded-for'];
  return (Array.isArray(xf) ? xf[0] : xf)?.split(',')[0]?.trim() || s.handshake.address || 'unknown';
};

const errorOf = (err: unknown): { code: string; fields?: Record<string, string> } => {
  if (err instanceof AppError) return { code: err.code, ...(err.fields ? { fields: err.fields } : {}) };
  if (err instanceof ZodError) return { code: 'VALIDATION_FAILED', fields: Object.fromEntries(err.issues.map((i) => [String(i.path[0] ?? '_'), i.code])) };
  return { code: 'INTERNAL' };
};

export class WidgetGateway implements BeforeApplicationShutdown, OnModuleDestroy {
  private io?: Server;
  private readonly install: NamespaceInstaller = (io) => this.attach(io);

  constructor(
    @Optional() @Inject(VisitorService) private readonly visitors: VisitorService | null,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {
    if (visitors) registerNamespace(this.install);
  }

  private attach(io: Server): void {
    const visitors = this.visitors!;
    this.io = io;
    const nsp = io.of(WIDGET_NAMESPACE);
    nsp.use((socket, next) => {
      const auth = socket.handshake.auth as Record<string, unknown>;
      visitors
        .connect({ publicKey: auth.public_key, token: auth.visitor_token, origin: socket.handshake.headers.origin, ip: ipOf(socket) })
        .then((session) => {
          socket.data = session;
          next();
        })
        .catch((err: unknown) => {
          const e = errorOf(err);
          next(Object.assign(new Error(e.code), { data: e }));
        });
    });
    nsp.on('connection', (s) => this.onConnection(s));
  }

  private onConnection(s: Socket): void {
    const session = s.data as WidgetSession;
    if (session.visitorId) void s.join(visitorRoom(session.visitorId));
    const handle = (fn: () => Promise<unknown>, ack: unknown) => {
      const reply = typeof ack === 'function' ? (ack as Ack) : () => undefined;
      fn().then(
        (data) => reply({ data }),
        (err: unknown) => {
          const e = errorOf(err);
          if (e.code === 'INTERNAL') this.log.error({ err }, 'widget handler lỗi');
          reply({ error: e });
        },
      );
    };
    s.on('visitor.hello', (p: unknown, ack: unknown) =>
      handle(async () => {
        const r = await this.visitors!.hello(session, p);
        // Khách mới (hoặc token cũ của tài khoản khác) → phòng theo khách vừa xác định.
        await s.join(visitorRoom(r.visitor_id));
        return r;
      }, ack),
    );
    s.on('message.send', (p: unknown, ack: unknown) => handle(() => this.visitors!.send(session, p, ipOf(s)), ack));
  }

  beforeApplicationShutdown(): void {
    this.io?.of(WIDGET_NAMESPACE).local.disconnectSockets(true);
  }

  onModuleDestroy(): void {
    unregisterNamespace(this.install);
  }
}
