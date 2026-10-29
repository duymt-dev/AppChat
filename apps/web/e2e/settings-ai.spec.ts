import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const S = '?session=authed,declared,trialSeen';
const go = (section: string) => `/settings/${section}${S}`;

test.describe('settings · AI', () => {
  test('AI Models: chỉ mức AI (không tên model — D29), đổi mặc định, mức khoá → Gói, đổi mức theo tác vụ', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('ai_models'));
    await expect(page.locator('[data-tier]')).toHaveCount(3);
    await expect(page.getByText(/Claude|Haiku|Sonnet|Opus/)).toHaveCount(0);
    await expect(page.getByText('Tự động chuyển model')).toHaveCount(0);
    await page.getByTestId('st-ai-tier-advanced').click();
    await expect(page.getByTestId('st-ai-tier-advanced')).toHaveText('Đang dùng mặc định');
    await expect(page.getByTestId('st-ai-task-copilot').locator('option')).toHaveCount(2);
    await page.getByTestId('st-ai-task-copilot').selectOption('advanced');
    await page.getByTestId('st-ai-budget').fill('8000000');
    await page.getByTestId('st-ai-task-insights').focus();
    await expect(page.getByTestId('st-ai-budget')).toHaveValue('8,000,000');
    await page.getByTestId('st-ai-tier-max').click();
    await expect(page).toHaveURL(/\/settings\/billing/, { timeout: 15_000 });
  });

  test('RAG: nav AI đã học, lọc thư mục, tìm theo thẻ, tải lên (không học), học lại, xoá → thùng rác', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('rag_data'));
    await expect(page.locator('[data-doc]')).toHaveCount(8);
    await page.getByTestId('st-rag-nav-learned').click();
    await expect(page.locator('[data-doc]')).toHaveCount(5);
    await page.getByRole('button', { name: 'Bảng giá' }).click();
    await expect(page.locator('[data-doc]')).toHaveCount(1);
    await page.getByTestId('st-rag-nav-all').click();
    await page.getByTestId('st-rag-search').fill('van hanh');
    await expect(page.locator('[data-doc]')).toHaveCount(2);
    await page.getByTestId('st-rag-search').fill('');
    await page.getByTestId('st-rag-upload').click();
    const m = page.getByTestId('st-rag-modal');
    await m.getByTestId('st-rag-name').fill('Bảng giá dịch vụ 2026.xlsx');
    await m.getByTestId('st-rag-folder-select').selectOption({ label: 'Bảng giá' });
    await m.getByTestId('st-rag-learn').click();
    await m.getByTestId('st-rag-modal-save').click();
    const row = page.locator('[data-doc]').filter({ hasText: 'Bảng giá dịch vụ 2026.xlsx' });
    await expect(row).toBeVisible();
    await expect(row).not.toContainText('Đã học');
    await row.getByTestId('st-row-menu').click();
    await page.getByRole('menuitem', { name: 'Học lại' }).click();
    await expect(row).toContainText('Đã học');
    await row.getByTestId('st-row-menu').click();
    await page.getByRole('menuitem', { name: 'Chuyển vào thùng rác' }).click();
    await expect(page.locator('[data-doc]')).toHaveCount(8);
    await expect(page.getByTestId('st-rag-nav-trash')).toContainText('9');
    await page.getByTestId('st-rag-folder').click();
    await page.getByTestId('st-rag-folder-name').fill('Quy trình dịch vụ');
    await page.getByRole('button', { name: 'Tạo', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Quy trình dịch vụ' })).toBeVisible();
  });

  test('AI Governance: bật phạm vi PII, thêm / bỏ từ khoá cấm, đổi thời gian lưu', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('ai_gov'));
    const pii = page.getByTestId('st-gov-scope-pii');
    await expect(pii).toHaveAttribute('aria-checked', 'false');
    await pii.click();
    await expect(pii).toHaveAttribute('aria-checked', 'true');
    const kws = page.getByTestId('st-gov-keywords');
    await page.getByTestId('st-gov-kw-input').fill('cam kết khỏi bệnh');
    await page.getByTestId('st-gov-kw-input').press('Enter');
    await expect(kws).toContainText('cam kết khỏi bệnh');
    await kws.getByRole('button', { name: 'Bỏ từ khoá tôn giáo' }).click();
    await expect(kws).not.toContainText('tôn giáo');
    await page.getByLabel('Lưu prompt + câu trả lời').selectOption('365');
    await page.getByTestId('st-nav-audit').click();
    await page.getByTestId('st-nav-ai_gov').click();
    await expect(page.getByLabel('Lưu prompt + câu trả lời')).toHaveValue('365');
    await expect(page.getByTestId('st-gov-scope-pii')).toHaveAttribute('aria-checked', 'true');
  });

  test('Audit log + AI Audit log: bảng chỉ đọc, nhật ký AI ghi "Trợ lý AI" (không tên model), xuất JSON', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('audit'));
    await expect(page.locator('[data-audit]')).toHaveCount(7);
    const dl = page.waitForEvent('download');
    await page.getByTestId('st-audit-export').click();
    expect((await dl).suggestedFilename()).toBe('audit-log.json');
    await page.getByTestId('st-nav-ai_audit').click();
    await expect(page.locator('[data-audit]')).toHaveCount(7);
    await expect(page.getByTestId('st-ai-audit')).not.toContainText('Claude');
    await expect(page.getByTestId('st-ai-audit')).toContainText('Escalated');
  });

  test('quyền: Nhân viên kinh doanh không vào được AI Models / Governance / Audit', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('ai_models'));
    await page.evaluate(() => localStorage.setItem('ac_mock_role', 'sales'));
    await page.reload();
    await expect(page.getByText('Bạn không có quyền xem mục này')).toBeVisible();
    await page.goto(go('audit'));
    await expect(page.getByText('Bạn không có quyền xem mục này')).toBeVisible();
    await page.evaluate(() => localStorage.removeItem('ac_mock_role'));
  });

  test('390: AI Models, RAG + hộp tải lên, Governance, Audit — không tràn ngang, vùng chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(go('ai_models'));
    await expect(page.locator('[data-tier]').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('st-ai-tier-advanced'));
    await page.goto(go('rag_data'));
    await expect(page.locator('[data-doc]').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('st-rag-nav-learned'));
    await page.getByTestId('st-rag-upload').click();
    await expect(page.getByTestId('st-rag-modal')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.goto(go('ai_gov'));
    await expect(page.getByTestId('st-gov-scopes')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('st-gov-scope-pii'));
    await page.goto(go('audit'));
    await expect(page.locator('[data-audit]').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.goto(go('ai_audit'));
    await expect(page.locator('[data-audit]').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
