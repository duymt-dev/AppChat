// VietQR ảnh thật cho đề nghị thanh toán (TIP-032b P2, COMMERCE §5; Blueprint §8 "render QR bằng `qrcode`"): payload EMVCo/NAPAS dựng từ
// tài khoản nhận + số còn phải thu + nội dung CK = mã đề nghị (cùng `vietQrPayload` của invoice-view). Ảnh PNG dùng ở ba chỗ: nhúng `data:`
// vào PDF đóng băng lúc gửi (mẫu có `{{payment.vietqr_img}}` hoặc chèn sau dòng VietQR), tệp ảnh riêng gửi Zalo kèm PDF (khách quét từ điện
// thoại), và `GET /v1/invoices/:id/qr` (quyền xem đề nghị, no-store). Không có tài khoản nhận / đã thu đủ → null (không bịa QR).
import QRCode from 'qrcode';
import { invoiceTransferCode, vietQrPayload } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import type { InvoiceRecord } from '../invoice-access';

type Account = { bank: string; bankBin: string; accountNo: string; accountName: string };

export interface InvoiceQr {
  payload: string;
  amount: string;
  content: string;
  account: Account;
}

/** Payload VietQR của số còn phải thu. Chưa cấu hình tài khoản nhận hoặc còn 0đ → null. */
export function invoiceQrOf(i: Pick<InvoiceRecord, 'code' | 'amount' | 'paidAmount'>, account: Account | null): InvoiceQr | null {
  const left = i.amount - i.paidAmount;
  if (!account?.bankBin || !account.accountNo || left <= 0n) return null;
  const content = invoiceTransferCode(i.code);
  return { payload: vietQrPayload({ bin: account.bankBin, account_no: account.accountNo, amount: String(left), content }), amount: String(left), content, account };
}

export async function readInvoiceQr(tx: Pick<TenantTx, 'paymentAccount'>, i: Pick<InvoiceRecord, 'code' | 'amount' | 'paidAmount'>) {
  return invoiceQrOf(i, await tx.paymentAccount.findUnique({ where: { id: 1 }, select: { bank: true, bankBin: true, accountNo: true, accountName: true } }));
}

/** Ảnh PNG (mức sửa lỗi M, lề 4 module — đủ cho app ngân hàng quét từ PDF in / màn hình). */
export const qrPng = (payload: string, width = 480): Promise<Buffer> => QRCode.toBuffer(payload, { type: 'png', errorCorrectionLevel: 'M', margin: 4, width });

export const pngDataUri = (png: Buffer) => `data:image/png;base64,${png.toString('base64')}`;
