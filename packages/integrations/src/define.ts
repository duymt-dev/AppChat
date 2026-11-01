// Dựng registry connector: kiểm trùng `key`, port hợp lệ; tra theo key / port; luật "kết nối được".
import { PORT_KEYS, type ConnectorEntry, type ConnectorManifest, type PortKey } from './types';

export interface ConnectorRegistry {
  readonly entries: readonly ConnectorEntry[];
  get(key: string): ConnectorEntry | undefined;
  byPort(port: PortKey): ConnectorEntry[];
  manifests(): ConnectorManifest[];
  /** Manifest hiện ở trang Nền tảng kết nối (bỏ connector `hidden`). */
  listed(): ConnectorManifest[];
  /** Kết nối được ⇔ không `coming_soon` (thẻ "Sắp có"); adapter tuỳ chọn — có thì kiểm kết nối / webhook / gọi port (DC-042). */
  isConnectable(key: string): boolean;
}

export function defineConnectors(entries: ConnectorEntry[]): ConnectorRegistry {
  const byKey = new Map<string, ConnectorEntry>();
  for (const e of entries) {
    const { key, port } = e.manifest;
    if (byKey.has(key)) throw new Error(`Connector trùng key: ${key}`);
    if (!PORT_KEYS.includes(port)) throw new Error(`Port không hợp lệ: ${key} → ${port}`);
    if (e.adapter && e.adapter.manifest.key !== key) throw new Error(`Adapter không khớp manifest: ${key}`);
    byKey.set(key, e);
  }
  return {
    entries,
    get: (key) => byKey.get(key),
    byPort: (port) => entries.filter((e) => e.manifest.port === port),
    manifests: () => entries.map((e) => e.manifest),
    listed: () => entries.map((e) => e.manifest).filter((m) => !m.hidden),
    isConnectable: (key) => {
      const e = byKey.get(key);
      return !!e && e.manifest.status !== 'coming_soon';
    },
  };
}
