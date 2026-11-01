// Dựng registry kênh: kiểm trùng `type` lúc import, tra cứu theo type, luật "kết nối được".
import type { ChannelEntry, ChannelManifest } from './types';

export interface ChannelRegistry {
  readonly entries: readonly ChannelEntry[];
  get(type: string): ChannelEntry | undefined;
  /** Theo thứ tự hiển thị của trang Kênh kết nối (`display.sort`). */
  manifests(): ChannelManifest[];
  /** Kết nối được ⇔ không `coming_soon` (DC-068: adapter gắn ở worker theo env — API chỉ cần manifest). */
  isConnectable(type: string): boolean;
  /** Có adapter thật trong registry này (worker). */
  hasAdapter(type: string): boolean;
}

export function defineChannels(entries: ChannelEntry[]): ChannelRegistry {
  const byType = new Map<string, ChannelEntry>();
  for (const e of entries) {
    if (byType.has(e.manifest.type)) throw new Error(`Kênh trùng type: ${e.manifest.type}`);
    if (e.adapter && e.adapter.manifest.type !== e.manifest.type) {
      throw new Error(`Adapter không khớp manifest: ${e.manifest.type}`);
    }
    byType.set(e.manifest.type, e);
  }
  return {
    entries,
    get: (type) => byType.get(type),
    manifests: () => entries.map((e) => e.manifest).sort((a, b) => a.display.sort - b.display.sort),
    isConnectable: (type) => {
      const e = byType.get(type);
      return !!e && e.manifest.status !== 'coming_soon';
    },
    hasAdapter: (type) => !!byType.get(type)?.adapter,
  };
}
