// Registry hợp đồng v2 (TIP-003b §5.1–5.2): domain ĐĂNG KÝ lúc bootstrap; coordinator ĐÓNG BĂNG một lần rồi mới tạo worker. Sau khi
// đóng băng không ai đổi tập topic được (không hàm động). Bảng bất biến (topic → consumer + chế độ + version) băm thành digest và lưu ở
// `event_registry_version` của từng tenant trước khi bật epoch; event cũ resolve theo version ĐÃ LƯU, không theo registry mới nhất.
import { createHash } from 'node:crypto';
import { isDeclaredTopic } from '@appchat/shared';
import type { ContractRow, EventContract, RegistryTable } from './types';

const contracts = new Map<string, EventContract>();
let frozen: FrozenRegistry | null = null;

export interface FrozenRegistry {
  table: RegistryTable;
  digest: string;
  contracts: ReadonlyMap<string, EventContract>;
}

export function registerEventContract(c: EventContract): void {
  if (frozen) throw new Error(`registry sự kiện đã đóng băng — không thể đăng ký ${c.name}`);
  const prev = contracts.get(c.name);
  if (prev && prev !== c) throw new Error(`Trùng event contract: ${c.name}`);
  for (const t of c.topics) if (!isDeclaredTopic(t)) throw new Error(`event contract ${c.name}: topic chưa khai ${t}`);
  contracts.set(c.name, c);
}

/** Đóng băng: `topics` = mọi topic cần có dòng (gồm topic khai không-consumer → mảng rỗng). */
export function freezeEventRegistry(topics: readonly string[]): FrozenRegistry {
  if (frozen) return frozen;
  const table: RegistryTable = {};
  for (const t of [...topics].sort()) table[t] = [];
  for (const c of [...contracts.values()].sort((a, b) => (a.name < b.name ? -1 : 1))) {
    for (const t of c.topics) {
      if (!table[t]) throw new Error(`event contract ${c.name}: topic ${t} không nằm trong tập đã khai của manifest`);
      table[t]!.push({ consumer: c.name, mode: c.mode, contract_version: c.contractVersion } satisfies ContractRow);
    }
  }
  const digest = registryDigest(table);
  frozen = { table, digest, contracts: new Map(contracts) };
  return frozen;
}

export const frozenEventRegistry = (): FrozenRegistry | null => frozen;

export function registryDigest(table: RegistryTable): string {
  const canon = Object.keys(table)
    .sort()
    .map((t) => `${t}=${table[t]!.map((r) => `${r.consumer}:${r.mode}:${r.contract_version}`).sort().join(',')}`)
    .join(';');
  return createHash('sha256').update(canon).digest('hex');
}

/** Chỉ test: xoá registry + mở băng. */
export function resetEventRegistryForTest(): void {
  contracts.clear();
  frozen = null;
}
