// Hợp đồng kênh (standards/channels/omnichannel-adapter.md → Hợp đồng; Blueprint §6). Core chỉ biết các kiểu này.
import type { z } from 'zod';

export type ChannelStatus = 'ga' | 'beta' | 'coming_soon';
export type ConnectKind = 'qr' | 'oauth' | 'credentials' | 'webhook' | 'embed';
export type HealthStatus = 'connected' | 'degraded' | 'error' | 'expired';
export type SendKind = 'text' | 'image' | 'file' | 'sticker' | 'audio' | 'card' | 'template';

export interface ChannelManifest {
  type: string;
  /** i18n key `channels.<type>.label`. */
  label: string;
  /** Key icon trong packages/ui. */
  icon: string;
  group: 'chat' | 'social' | 'email' | 'sms' | 'web' | 'commerce';
  status: ChannelStatus;
  connect: { kind: ConnectKind; fields?: z.ZodObject; riskNotice?: string };
  capabilities: {
    direct: boolean;
    group: boolean;
    mentions: boolean;
    reactions: boolean;
    send: SendKind[];
    maxTextLength: number;
    markdown: 'none' | 'rich' | 'html';
    proactive: 'allowed' | 'window_24h' | 'template_only' | 'disallowed';
  };
  rateLimit: { perMinute: number; perDayProactive?: number; jitterMs?: [number, number] };
  session: 'lease' | 'webhook' | 'poll';
}

export interface ChannelAccountRuntime {
  id: string;
  workspaceId: string;
  type: string;
  credentials: unknown;
  settings: Record<string, unknown>;
}

export interface NormalizedInbound {
  channelAccountId: string;
  externalThreadId: string;
  externalMsgId: string;
  isGroup: boolean;
  sender: { externalId: string; name?: string; avatarUrl?: string; phone?: string; email?: string };
  kind: 'text' | 'image' | 'file' | 'sticker' | 'audio';
  text?: string;
  attachments?: { url: string; mime: string; name?: string; size?: number }[];
  mentionsMe?: boolean;
  sentAt: string;
  raw: unknown;
}

export interface OutboundMessage {
  externalThreadId: string;
  kind: SendKind;
  text?: string;
  attachments?: { url: string; mime: string; name?: string }[];
  replyToExternalMsgId?: string;
}

export interface InboundSink {
  push(msg: NormalizedInbound): Promise<void>;
}

export interface RawWebhook {
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  rawBody?: Buffer;
}

export interface ChannelAdapter {
  manifest: ChannelManifest;
  start?(account: ChannelAccountRuntime, sink: InboundSink): Promise<void>;
  stop?(accountId: string): Promise<void>;
  handleWebhook?(req: RawWebhook, account: ChannelAccountRuntime, sink: InboundSink): Promise<void>;
  send(accountId: string, msg: OutboundMessage): Promise<{ externalMsgId: string }>;
  probe(accountId: string): Promise<HealthStatus>;
}

/** Một mục registry: manifest luôn có; adapter gắn khi TIP chủ kênh làm xong. */
export interface ChannelEntry {
  manifest: ChannelManifest;
  adapter?: ChannelAdapter;
}
