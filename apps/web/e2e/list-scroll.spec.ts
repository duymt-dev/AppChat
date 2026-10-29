// D42 — màn danh sách: chỉ thân bảng cuộn (đầu màn đứng yên), header bảng dính, phân trang có số trang đổi dữ liệu thật.
// Dữ liệu dày qua `?session=…,bulk` (~120 dòng / danh sách). < md: cả màn cuộn, danh sách thẻ + Trước / Sau 44px.
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const S = '?session=authed,declared,trialSeen,bulk';
const LISTS: [string, string, string][] = [
  ['/customers', 'crm-table', 'data-contact'],
  ['/products', 'pd-table', 'data-product'],
  ['/quotes', 'q-table', 'data-quote'],
  ['/orders', 'od-table', 'data-order'],
  ['/invoices', 'iv-table', 'data-invoice'],
  ['/contracts', 'ct-table', 'data-contract'],
  ['/tickets', 'tk-table', 'data-ticket'],
  ['/marketing', 'mk-table', 'data-campaign'],
];

const pageScroll = (page: Page) =>
  page.evaluate(() => {
    const m = document.querySelector('main > div') as HTMLElement;
    return m.scrollHeight - m.clientHeight;
  });

for (const [route, id, attr] of LISTS) {
  test(`${route}: cuộn trong bảng, header dính, phân trang`, async ({ page }) => {
    test.skip(isMobile(page), 'desktop');
    await page.goto(`${route}${S}`);
    const scroll = page.getByTestId(`${id}-scroll`);
    await expect(page.locator(`[${attr}]`).first()).toBeVisible();
    expect(await pageScroll(page), 'màn không cuộn').toBeLessThanOrEqual(1);
    const pager = page.getByTestId(`${id}-pager`);
    await expect(pager).toBeInViewport();
    await expect(pager).toContainText('1–20 / 120');
    await expect(page.locator(`[${attr}]`)).toHaveCount(20);
    // cuộn thân bảng: header vẫn nằm sát mép trên vùng cuộn
    await scroll.evaluate((el) => (el.scrollTop = 400));
    const gap = await scroll.evaluate((el) => {
      const th = el.querySelector('.ant-table-thead th') as HTMLElement;
      return Math.abs(th.getBoundingClientRect().top - el.getBoundingClientRect().top);
    });
    expect(gap, 'header dính').toBeLessThan(2);
    const first = await page.locator(`[${attr}]`).first().getAttribute(attr);
    await pager.getByTestId(`${id}-pager-page-2`).click();
    await expect(pager).toContainText('21–40 / 120');
    await expect(page.locator(`[${attr}]`).first()).not.toHaveAttribute(attr, first!);
    await pager.getByTestId(`${id}-pager-size`).selectOption('50');
    await expect(pager).toContainText('1–50 / 120');
    await expect(page.locator(`[${attr}]`)).toHaveCount(50);
  });
}

test('Khách thân thiết: bảng thành viên cuộn trong khung, phân trang', async ({ page }) => {
  test.skip(isMobile(page), 'desktop');
  await page.goto(`/loyalty${S}`);
  const box = page.getByTestId('ly-members-scroll');
  await expect(page.locator('[data-member]').first()).toBeVisible();
  expect(await box.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  const pager = page.getByTestId('ly-members-pager');
  await expect(pager).toContainText('1–20 / 120');
  await pager.getByTestId('ly-members-pager-next').click();
  await expect(pager).toContainText('21–40 / 120');
});

test('đổi bộ lọc → về trang 1', async ({ page }) => {
  test.skip(isMobile(page), 'desktop');
  await page.goto(`/quotes${S}`);
  const pager = page.getByTestId('q-table-pager');
  await pager.getByTestId('q-table-pager-page-3').click();
  await expect(pager).toContainText('41–60');
  await page.getByTestId('q-search').fill('BG-2041');
  await expect(pager).toContainText('1–');
});

test('390: danh sách thẻ + Trước / Sau ≥ 44px, không tràn ngang', async ({ page }) => {
  test.skip(!isMobile(page), 'mobile');
  for (const [route, id] of LISTS) {
    await page.goto(`${route}${S}`);
    const pager = page.getByTestId(`${id}-pager`);
    await expect(pager).toContainText('/ 120');
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(pager.locator('button:visible'));
  }
});
