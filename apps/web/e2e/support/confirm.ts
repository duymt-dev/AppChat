// Hộp xác nhận gửi / duyệt chứng từ (TIP-028b): bấm gửi báo giá / trình duyệt / duyệt & ký / gửi ký / gửi đề nghị thanh toán → useAction xin
// xem trước → ConfirmActionHost hiện bảng kiểm pháp lý (cảnh báo, không chặn — DC-444). Spec đợi hộp, kiểm bảng kiểm có mặt, bấm Xác nhận.
import { expect, type Page } from '@playwright/test';

export async function confirmPreview(page: Page, o: { checklist?: boolean; timeout?: number } = {}) {
  const box = page.getByRole('dialog', { name: 'Xác nhận thao tác' });
  await expect(box).toBeVisible({ timeout: o.timeout ?? 15_000 });
  if (o.checklist !== false) await expect(box.getByTestId('confirm-checklist')).toBeVisible();
  await box.getByRole('button', { name: 'Xác nhận' }).click();
  await expect(box).toBeHidden({ timeout: o.timeout ?? 15_000 });
}
