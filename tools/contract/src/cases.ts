// Ca contract FE ↔ BE: cùng request chạy qua mock transport (apps/web) và HTTP API thật (apps/api integration),
// rồi parse cùng zod output của Action Registry. TIP domain thêm ca vào đây khi nối httpTransport (D57).
export interface ContractCase {
  /** id action trong packages/actions */
  action: string;
  input: unknown;
  /** TIP sở hữu handler thật của action */
  tip: string;
  /** cần Idempotency-Key (send / money / *.create) */
  idempotent?: boolean;
}

export const CONTRACT_CASES: readonly ContractCase[] = [
  { action: 'notification.mark_read', input: { ids: 'all' }, tip: '003' },
];
