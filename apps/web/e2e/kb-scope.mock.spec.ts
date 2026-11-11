// TIP-020c — E2E chế độ mock: nháp / gợi ý AI phụ thuộc nguồn tri thức. Dùng nháp bàn giao → sửa chữ → gửi kèm tham chiếu (server kiểm);
// nguồn bị nạp lại (Dữ liệu RAG → "Huấn luyện lại", điều hướng trong SPA — cùng store mock) → nháp hết hiệu lực không còn chiếu; đổi hội
// thoại xoá tham chiếu. Thu hồi giữa lúc soạn (409 → chữ giữ, gửi lại là tin tự viết) kiểm ở E2E http `http/kb-scope.spec.ts` + unit.
// Mobile 390: không tràn ngang.
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const S = '?session=authed,declared,trialSeen';
const push = (page: Page, path: string) => page.evaluate((p) => (window as unknown as { next: { router: { push: (u: string) => void } } }).next.router.push(p), path);

async function openHieu(page: Page) {
  await page.goto(`/inbox${S}`);
  await page.locator('[data-conv="c_hieu"] button').first().click();
  await expect(page.getByTestId('handoff-banner')).toBeVisible();
}

const lastOut = (page: Page) => page.getByTestId('thread').getByTestId('msg-out').last();

test.describe('nháp AI phụ thuộc nguồn tri thức (mock)', () => {
  test('dùng nháp bàn giao → sửa chữ (vẫn giữ phụ thuộc) → gửi thành công', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await openHieu(page);
    await page.getByTestId('handoff-use-draft').click();
    const input = page.getByTestId('composer-input');
    await expect(input).toHaveValue(/Vietcombank/);
    await input.press('End');
    await input.pressSequentially(' Cảm ơn anh!');
    await page.getByTestId('composer-send').click();
    await expect(lastOut(page)).toContainText('Cảm ơn anh!');
    await expect(input).toHaveValue('');
  });

  test('nguồn nạp lại sau khi hiện nháp → gửi kèm tham chiếu cũ bị từ chối, chữ giữ; gửi lại = tin tự viết', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await openHieu(page);
    await page.getByTestId('handoff-use-draft').click();
    const input = page.getByTestId('composer-input');
    await expect(input).toHaveValue(/Vietcombank/);
    // Nạp lại toàn bộ nguồn ở Dữ liệu RAG (điều hướng trong SPA giữ store mock); chọn lại hội thoại đặt lại ô soạn.
    await push(page, `/settings/rag_data${S}`);
    await page.getByTestId('st-rag-train').click();
    await push(page, `/inbox${S}`);
    await page.locator('[data-conv="c_hieu"] button').first().click();
    // Nháp hết hiệu lực không còn chiếu: banner vẫn báo cần người, nhưng không còn "Dùng bản nháp".
    await expect(page.getByTestId('handoff-banner')).toBeVisible();
    await expect(page.getByTestId('handoff-use-draft')).toHaveCount(0);
  });

  test('đổi hội thoại xoá tham chiếu nháp — tin tay ở hội thoại khác gửi bình thường; mobile 390 không tràn', async ({ page }) => {
    await openHieu(page);
    if (isMobile(page)) {
      await expectNoHorizontalOverflow(page);
      return;
    }
    await page.getByTestId('handoff-use-draft').click();
    await page.locator('[data-conv="c_lan"] button').first().click();
    const input = page.getByTestId('composer-input');
    await expect(input).toHaveValue('');
    await input.fill('Chào chị Lan');
    await page.getByTestId('composer-send').click();
    await expect(lastOut(page)).toContainText('Chào chị Lan');
  });
});
