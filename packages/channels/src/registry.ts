// DUY NHẤT nơi liệt kê kênh (omnichannel-adapter → Hợp đồng). TIP chủ kênh gắn `adapter` vào đúng dòng của mình.
// Adapter cần dependency lúc chạy (transport Zalo thật / giả) → `buildChannelRegistry(deps)`; `channelRegistry` là bản chỉ
// manifest (API đọc trang Kênh, FE, AI) — kết nối được theo manifest (DC-068).
import { defineChannels, type ChannelRegistry } from './define';
import { comingSoonChannels } from './coming-soon';
import { emailManifest } from './email/manifest';
import { webchatManifest } from './webchat/manifest';
import { zaloPersonalManifest } from './zalo-personal/manifest';
import { ZaloPersonalAdapter, type FileFetcher } from './zalo-personal/adapter';
import type { ZaloTransport } from './zalo-personal/transport';

export interface ChannelDeps {
  zalo?: ZaloTransport;
  files?: FileFetcher;
}

export function buildChannelRegistry(deps: ChannelDeps = {}): ChannelRegistry {
  return defineChannels([
    { manifest: zaloPersonalManifest, ...(deps.zalo ? { adapter: new ZaloPersonalAdapter(deps.zalo, deps.files) } : {}) },
    { manifest: webchatManifest }, // adapter: TIP-017
    { manifest: emailManifest }, // adapter: TIP-018
    ...comingSoonChannels.map((manifest) => ({ manifest })),
  ]);
}

export const channelRegistry = buildChannelRegistry();
