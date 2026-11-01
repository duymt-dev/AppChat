// Màu trạng thái / thanh toán lịch hẹn — prototype ST / PD L11124–11125.
import { color } from '@appchat/ui';
import type { ApptStatus } from './types';

export const STATUS_TONE: Record<ApptStatus, [fg: string, bg: string]> = {
  confirmed: [color.successStrong, color.successBg],
  pending: [color.amberDeep, color.amberBg],
  in_progress: [color.blue, color.infoTint],
  done: [color.slate, color.slateBg],
  no_show: [color.dangerStrong, color.dangerBg],
  cancelled: [color.text4, color.muteBg],
  expired: [color.text4, color.muteBg],
};

export const PAY_TONE: Record<string, string> = {
  paid: color.successStrong,
  partial: color.periwinkle,
  pending: color.amberDeep,
  free: color.slate,
  package: color.violet,
};

/** Lựa chọn lọc trạng thái (prototype filter bar L3896). */
export const STATUSES: ApptStatus[] = ['confirmed', 'pending', 'in_progress', 'done', 'no_show'];
