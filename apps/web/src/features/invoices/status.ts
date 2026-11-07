// Màu chip trạng thái đề nghị thanh toán — prototype M L11391 (paid / sent / overdue / draft) mở rộng theo COMMERCE §5 (partial / void).
import { color } from '@appchat/ui';
import type { InvoiceStatus } from './types';

export const STATUS_TONE: Record<InvoiceStatus, [fg: string, bg: string]> = {
  paid: [color.statusActive, color.brandBg],
  sent: [color.paidText, color.statusPotentialBg],
  partial: [color.amberText, color.alertBg],
  overdue: [color.hotText, color.dangerSoftBg],
  draft: [color.text3, color.muteBg],
  void: [color.text4, color.muteBg],
};

export const avInitial = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(-2)
    .join('')
    .toUpperCase() || '?';
