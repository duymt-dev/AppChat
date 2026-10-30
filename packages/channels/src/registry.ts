// DUY NHẤT nơi liệt kê kênh (omnichannel-adapter → Hợp đồng). TIP chủ kênh gắn `adapter` vào đúng dòng của mình.
import { defineChannels } from './define';
import { comingSoonChannels } from './coming-soon';
import { emailManifest } from './email/manifest';
import { webchatManifest } from './webchat/manifest';
import { zaloPersonalManifest } from './zalo-personal/manifest';

export const channelRegistry = defineChannels([
  { manifest: zaloPersonalManifest }, // adapter: TIP-014
  { manifest: webchatManifest }, // adapter: TIP-017
  { manifest: emailManifest }, // adapter: TIP-018
  ...comingSoonChannels.map((manifest) => ({ manifest })),
]);
