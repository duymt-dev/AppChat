// TIP-020e AC8 — E2E mock: Cài đặt › Dữ liệu RAG. Chỉ mục hiện hành → không có thẻ; model embedding đã đổi (kịch bản `stale`) → thẻ
// cảnh báo + "Tạo lại chỉ mục" → thẻ xác nhận BẮT BUỘC (ước tính + cảnh báo khe cũ) → xác nhận → tiến độ thật tăng dần (poll 5s) → xong
// thì thẻ biến mất; huỷ giữa chừng → "Đã huỷ", khe cũ vẫn dùng; lỗi gần nhất → lý do dịch; model khe gỡ → chỉ tìm từ khoá. 390: thẻ không
// tràn ngang, nút ≥ 44px.
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const URL = '/settings/rag_data?session=authed,declared,trialSeen';
const KEY = 'ac_mock_kb_index';

async function open(page: Page, scenario: string | null) {
  await page.addInitScript(([k, v]) => {
    if (v) window.localStorage.setItem(k!, v);
    else window.localStorage.removeItem(k!);
  }, [KEY, scenario]);
  await page.goto(URL);
  await expect(page.getByTestId('st-rag')).toBeVisible();
}

test.describe('kb-reindex', () => {
  test('chỉ mục hiện hành → không có thẻ trạng thái', async ({ page }) => {
    await open(page, null);
    await expect(page.getByTestId('st-rag-index')).toHaveCount(0);
  });

  test('cũ → xem trước bắt buộc có ước tính → xác nhận → tiến độ thật → xong, thẻ biến mất', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await open(page, 'stale');
    const card = page.getByTestId('st-rag-index');
    await expect(card).toHaveAttribute('data-state', 'stale');
    await expect(card).toContainText('text-embedding-3-small');
    await expect(card).toContainText('text-embedding-3-large');
    await page.getByTestId('st-rag-index-reindex').click();
    const dlg = page.getByRole('dialog');
    await expect(dlg).toContainText('120');
    await expect(dlg.locator('[data-warning="kb_reindex_old_slot_serves"]')).toContainText('tìm kiếm vẫn dùng chỉ mục hiện tại');
    await dlg.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(card).toHaveAttribute('data-state', 'building');
    const progress = page.getByTestId('st-rag-index-progress');
    await expect(progress).toContainText('/ 120 đoạn');
    // Poll 5s: mock tiến một lô mỗi lần đọc → catching_up → publish (thẻ biến mất).
    await expect(card).toHaveCount(0, { timeout: 30_000 });
  });

  test('huỷ giữa chừng → "Đã huỷ", khe cũ vẫn dùng, tạo lại được', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await open(page, 'stale');
    await page.getByTestId('st-rag-index-reindex').click();
    await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận' }).click();
    const card = page.getByTestId('st-rag-index');
    await expect(card).toHaveAttribute('data-state', 'building');
    await page.getByTestId('st-rag-index-cancel').click();
    await expect(card).toHaveAttribute('data-state', 'cancelled');
    await expect(card).toContainText('text-embedding-3-small');
    await expect(page.getByTestId('st-rag-index-reindex')).toBeVisible();
  });

  test('lỗi gần nhất → lý do; model của khe gỡ → chỉ tìm từ khoá', async ({ page }) => {
    await open(page, 'failed');
    await expect(page.getByTestId('st-rag-index')).toContainText('Lý do: hết Credit.');
    await open(page, 'retired');
    const card = page.getByTestId('st-rag-index');
    await expect(card).toHaveAttribute('data-state', 'embed_space_retired');
    await expect(card).toContainText('chỉ tìm theo từ khoá');
    if (isMobile(page)) {
      await expectNoHorizontalOverflow(page);
      await expectTouchTargets(card.locator('button'));
    }
  });
});
