// F7 · f7:roles — đổi 5 vai trò (dev toolbar / ac_mock_role): mục rail, màn module và nút chính đúng ma trận Blueprint §3.5.
import { expect, test, type Page } from '@playwright/test';
import { isMobile } from './support/mobile';

const S = '?session=authed,declared,trialSeen';
const DENIED = 'Bạn không có quyền xem mục này';
type Role = 'owner' | 'manager' | 'sales' | 'cs' | 'accountant';

/** Mục rail hiện theo vai trò (dashboard luôn hiện; nhóm CRM nằm dưới "Khách hàng"). */
const RAIL: Record<Role, string[]> = {
  owner: ['dashboard', 'assistant', 'inbox', 'customers', 'tickets', 'marketing', 'calendar', 'agents'],
  manager: ['dashboard', 'assistant', 'inbox', 'customers', 'tickets', 'marketing', 'calendar', 'agents'],
  sales: ['dashboard', 'assistant', 'inbox', 'customers', 'tickets', 'calendar'],
  cs: ['dashboard', 'assistant', 'inbox', 'customers', 'tickets', 'calendar'],
  accountant: ['dashboard', 'assistant', 'customers'],
};

/** Route module bị chặn (no-permission) theo vai trò. */
const BLOCKED: Record<Role, string[]> = {
  owner: [],
  manager: [],
  sales: ['/marketing', '/agents'],
  cs: ['/marketing', '/agents', '/quotes', '/orders', '/invoices', '/contracts'],
  accountant: ['/inbox', '/tickets', '/calendar', '/marketing', '/agents'],
};

/** Nút chính hiện / ẩn theo permission: [route, testid, permission-có-ở-vai-trò]. */
const BUTTONS: [string, string, Role[]][] = [
  ['/customers', 'crm-create', ['owner', 'manager', 'sales', 'cs']],
  ['/products', 'pd-add', ['owner', 'manager']],
  ['/calendar', 'cal-create', ['owner', 'manager', 'sales', 'cs']],
];

const asRole = async (page: Page, role: Role) => {
  await page.goto(`/dashboard${S}`);
  await page.evaluate((r) => localStorage.setItem('ac_mock_role', r), role);
};

for (const role of Object.keys(RAIL) as Role[]) {
  test(`vai trò ${role}: rail, màn module, nút chính đúng Blueprint §3.5`, async ({ page }) => {
    test.skip(isMobile(page), 'ma trận kiểm trên desktop (rail); mobile kiểm ở test dưới');
    await asRole(page, role);
    await page.goto(`/dashboard${S}`);
    const rail = page.getByTestId('nav-rail');
    await expect(rail.locator('[data-nav="dashboard"]')).toBeVisible();
    for (const k of RAIL.owner) {
      await expect(rail.locator(`[data-nav="${k}"]`)).toHaveCount(RAIL[role].includes(k) ? 1 : 0);
    }
    for (const r of BLOCKED[role]) {
      await page.goto(`${r}${S}`);
      await expect(page.getByText(DENIED), r).toBeVisible();
    }
    for (const [r, id, roles] of BUTTONS) {
      if (BLOCKED[role].includes(r)) continue;
      await page.goto(`${r}${S}`);
      await expect(page.getByText(DENIED)).toHaveCount(0);
      if (roles.includes(role)) await expect(page.getByTestId(id), `${r} ${id}`).toBeVisible();
      else {
        await expect(page.locator('main')).not.toBeEmpty();
        await expect(page.getByTestId(id), `${r} ${id}`).toHaveCount(0);
      }
    }
    await page.evaluate(() => localStorage.removeItem('ac_mock_role'));
  });
}

test('390: Kế toán — thanh tab và "Thêm" chỉ hiện module được phép', async ({ page }) => {
  test.skip(!isMobile(page), 'chỉ mobile');
  await asRole(page, 'accountant');
  await page.goto(`/dashboard${S}`);
  const bar = page.getByTestId('mobile-tabbar');
  await expect(bar.getByRole('button', { name: 'Hộp thư' })).toHaveCount(0);
  await bar.getByTestId('mobile-more').click();
  const drawer = page.locator('.ant-drawer');
  await expect(drawer.getByText('Đề nghị thanh toán')).toBeVisible();
  await expect(drawer.getByText('Marketing')).toHaveCount(0);
  await page.goto(`/inbox${S}`);
  await expect(page.getByText(DENIED)).toBeVisible();
  await page.evaluate(() => localStorage.removeItem('ac_mock_role'));
});
