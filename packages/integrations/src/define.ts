// Dựng registry connector: kiểm trùng `key`, port hợp lệ; tra theo key / port; luật "kết nối được".
import { PORT_KEYS, type ConnectionMode, type ConnectorAdapter, type ConnectorEntry, type ConnectorManifest, type PortKey } from './types';

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
    for (const [mode, a] of Object.entries(e.adapters ?? {})) {
      if (a.manifest.key !== key) throw new Error(`Adapter không khớp manifest: ${key}`);
      if (!e.manifest.modes.includes(mode as ConnectionMode)) throw new Error(`Adapter chế độ ngoài manifest: ${key} → ${mode}`);
    }
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

/** Chế độ của kết nối: yêu cầu tường minh phải thuộc `manifest.modes`; bỏ trống = live nếu manifest có, không thì sandbox. Sai → null. */
export function resolveMode(m: ConnectorManifest, requested?: ConnectionMode | null): ConnectionMode | null {
  if (requested) return m.modes.includes(requested) ? requested : null;
  return m.modes.includes('live') ? 'live' : 'sandbox';
}

/** Adapter đúng chế độ — không lùi sang chế độ khác (live không bao giờ dùng adapter giả lập). */
export function adapterFor<A extends ConnectorAdapter = ConnectorAdapter>(e: ConnectorEntry | undefined, mode: ConnectionMode): A | undefined {
  return e?.adapters?.[mode] as A | undefined;
}
