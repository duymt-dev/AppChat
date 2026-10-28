// Màu chip trạng thái hợp đồng — prototype ST L9472 (trạng thái theo COMMERCE §9).
import { color } from '@appchat/ui';
import type { ContractChip, ContractStatus } from './types';

export const STATUS_TONE: Record<ContractStatus, [fg: string, bg: string]> = {
  draft: [color.text3, color.pillBg],
  pending_approval: [color.text3, color.pillBg],
  pending_signature: [color.amberText, color.warnSoftBg],
  signed: [color.brandInk, color.doneBg],
  declined: [color.dangerDeep, color.roseBg],
  expired: [color.dangerDeep, color.roseBg],
  terminated: [color.dangerDeep, color.roseBg],
};

/** Cột kanban (prototype ctKanbanCols L9468): Đã ký · Chờ ký · Nháp · Hết hạn. */
export const KANBAN: [key: Exclude<ContractChip, 'all'>, tone: string][] = [
  ['signed', color.brandInk],
  ['pending', color.amberText],
  ['draft', color.text3],
  ['expired', color.dangerDeep],
];

/** Chip lọc (prototype ctFilters L9470). */
export const FILTERS: ContractChip[] = ['all', 'signed', 'pending', 'draft', 'expired'];

export const chipOf = (s: ContractStatus): string =>
  s === 'pending_approval' ? 'draft' : s === 'pending_signature' ? 'pending' : s;

/** Avatar chữ cái + màu theo độ dài tên (prototype av / avBg). */
export const avInitial = (name: string) => (name.replace(/^(Chị|Anh|Cty) /, '')[0] ?? '?').toUpperCase();
export const avColor = (name: string) => `hsl(${(name.length * 47) % 360} 50% 46%)`;
