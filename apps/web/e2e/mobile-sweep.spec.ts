// F7 · f7:mobile-sweep — rà mọi route ở 390×844 (prototype-parity §9): không tràn ngang, các nút / tab hiển thị đạt vùng chạm ≥ 44px.
// Luồng action chính từng màn nằm ở spec của module; spec này bảo đảm không màn nào bị sót.
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const S = '?session=authed,declared,trialSeen';
const SETTINGS = [
  'general', 'locale', 'members', 'roles', 'org_sla', 'channels', 'web_widget', 'integrations', 'contacts_fields', 'tags',
  'replies', 'ai_models', 'rag_data', 'ai_gov', 'ai_audit', 'audit', 'notifications', 'billing', 'wallet', 'doc_templates', 'profile',
];
const APP = [
  '/dashboard', '/assistant', '/assistant/cowork', '/assistant/approvals', '/assistant/actions', '/inbox', '/customers', '/tickets',
  '/marketing', '/calendar', '/agents', '/agents/new', '/products', '/quotes', '/orders', '/invoices', '/contracts', '/loyalty',
  ...SETTINGS.map((k) => `/settings/${k}`),
];
const PUBLIC = ['/login?session=', '/register?session=', '/forgot-password', '/reset-password?token=abc', '/sign/tk_1181_demo'];

/** Nút / tab đang hiển thị trong main + thanh tab: cao ≥ 44px (không tính ô nhập, link trong đoạn văn). */
const smallTargets = (page: Page) =>
  page.evaluate(() => {
    const MIN = 44;
    const els = [...document.querySelectorAll('main button, main [role="tab"], [data-testid="mobile-tabbar"] button, form button')];
    return els
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && r.top < window.innerHeight && r.bottom > 0;
      })
      .filter((el) => el.getBoundingClientRect().height < MIN)
      .map((el) => `${el.getAttribute('data-testid') ?? el.tagName}:${(el.textContent ?? '').trim().slice(0, 24)}:${Math.round(el.getBoundingClientRect().height)}`);
  });

for (const url of [...APP, ...PUBLIC]) {
  test(`390 ${url}`, async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile 390');
    await page.goto(url.includes('?') ? url : `${url}${APP.includes(url) ? S : ''}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toBeEmpty();
    await expectNoHorizontalOverflow(page);
    expect(await smallTargets(page), 'nút < 44px').toEqual([]);
  });
}
