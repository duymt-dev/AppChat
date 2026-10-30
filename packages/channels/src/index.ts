export * from './types';
export * from './define';
export { channelRegistry, buildChannelRegistry, type ChannelDeps } from './registry';
export { ZaloPersonalAdapter, fetchFile, type FileFetcher } from './zalo-personal/adapter';
export { ZcaTransport } from './zalo-personal/zca-transport';
export { FakeZaloTransport, FakeZaloSession, fakeZaloTransport, FAKE_QR_PNG, type FakeSent } from './zalo-personal/fake-transport';
export { toRichText, chunkText, renderChunks } from './zalo-personal/render';
export { normalizeZalo } from './zalo-personal/normalize';
export type { ZaloTransport, ZaloSession, ZaloCredentials, ZaloRawMessage } from './zalo-personal/transport';
