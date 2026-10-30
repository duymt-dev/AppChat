// DUY NHẤT nơi liệt kê kênh (omnichannel-adapter → Hợp đồng). TIP chủ kênh gắn `adapter` vào đúng dòng của mình.
// Adapter cần dependency lúc chạy (transport Zalo thật / giả) → `buildChannelRegistry(deps)`; `channelRegistry` là bản chỉ
// manifest (API đọc trang Kênh, FE, AI) — kết nối được theo manifest (DC-068).
import { defineChannels, type ChannelRegistry } from './define';
import { comingSoonChannels } from './coming-soon';
import { emailManifest } from './email/manifest';
import { webchatManifest } from './webchat/manifest';
import { WebchatAdapter, type WidgetPublisher } from './webchat/adapter';
import { zaloPersonalManifest } from './zalo-personal/manifest';
import { ZaloPersonalAdapter, type FileFetcher } from './zalo-personal/adapter';
import type { ZaloTransport } from './zalo-personal/transport';

export interface ChannelDeps {
  zalo?: ZaloTransport;
  files?: FileFetcher;
  /** Phát tin tới widget (core: redis-emitter namespace `/widget`) — có thì gắn adapter webchat. */
  widget?: WidgetPublisher;
}

export function buildChannelRegistry(deps: ChannelDeps = {}): ChannelRegistry {
  return defineChannels([
    { manifest: zaloPersonalManifest, ...(deps.zalo ? { adapter: new ZaloPersonalAdapter(deps.zalo, deps.files) } : {}) },
    { manifest: webchatManifest, ...(deps.widget ? { adapter: new WebchatAdapter(deps.widget) } : {}) },
    { manifest: emailManifest }, // adapter: TIP-018
    ...comingSoonChannels.map((manifest) => ({ manifest })),
  ]);
}

export const channelRegistry = buildChannelRegistry();
