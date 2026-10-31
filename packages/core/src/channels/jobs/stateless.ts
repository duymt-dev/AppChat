// Kênh không giữ phiên (manifest `session = 'webhook'` — webchat TIP-017; kênh poll — ChannelPollers): không có lease, worker gửi của
// tài khoản mở ở MỌI worker ROLE=channels khi route `connected` (BullMQ giao mỗi job cho một worker), đóng khi route đổi
// (tạm dừng / ngắt). Chạy cùng nhịp với ChannelSessions; tin vào của các kênh này do API đẩy thẳng vào `channel-inbound`.
import type { ChannelAdapter, ChannelRegistry } from '@appchat/channels';
import type { PlatformDb } from '@appchat/db';
import type { AppLogger } from '../../kernel/logger/logger';

export interface StatelessDeps {
  platform: Pick<PlatformDb, 'tenantChannelRoute'>;
  registry: ChannelRegistry;
  log: AppLogger;
  open: (accountId: string, ws: string, adapter: ChannelAdapter) => Promise<void>;
  close: (accountId: string) => Promise<void>;
}

export class StatelessChannels {
  private readonly opened = new Set<string>();
  private ticking = false;

  constructor(private readonly d: StatelessDeps) {}

  private types(): string[] {
    return this.d.registry.manifests().filter((m) => m.session === 'webhook' && this.d.registry.hasAdapter(m.type)).map((m) => m.type);
  }

  async tick(): Promise<void> {
    const types = this.types();
    if (this.ticking || !types.length) return;
    this.ticking = true;
    try {
      const routes = await this.d.platform.tenantChannelRoute.findMany({ where: { status: 'connected', type: { in: types } }, select: { channelAccountId: true, workspaceId: true, type: true } });
      const live = new Set(routes.map((r) => r.channelAccountId));
      for (const id of [...this.opened]) {
        if (live.has(id)) continue;
        this.opened.delete(id);
        await this.d.close(id);
      }
      for (const r of routes) {
        const adapter = this.d.registry.get(r.type)?.adapter;
        if (this.opened.has(r.channelAccountId) || !adapter) continue;
        await this.d.open(r.channelAccountId, r.workspaceId, adapter).then(
          () => void this.opened.add(r.channelAccountId),
          (err: unknown) => this.d.log.warn({ err, account: r.channelAccountId }, 'stateless channel sender open failed'),
        );
      }
    } catch (err) {
      this.d.log.error({ err }, 'stateless channels tick failed');
    } finally {
      this.ticking = false;
    }
  }

  isOpen(accountId: string): boolean {
    return this.opened.has(accountId);
  }
}
