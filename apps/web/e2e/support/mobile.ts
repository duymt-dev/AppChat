// Kiểm chung cho mobile 390 (prototype-parity §9): không tràn ngang, vùng chạm ≥ 44px.
import { expect, type Locator, type Page } from '@playwright/test';

export async function expectNoHorizontalOverflow(page: Page) {
  const { scroll, inner } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    inner: window.innerWidth,
  }));
  expect(scroll, 'scrollWidth <= innerWidth').toBeLessThanOrEqual(inner);
}

export async function expectTouchTargets(targets: Locator, min = 44) {
  const n = await targets.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const box = await targets.nth(i).boundingBox();
    expect(box, `target ${i} visible`).not.toBeNull();
    expect(box!.height, `target ${i} height`).toBeGreaterThanOrEqual(min);
    expect(box!.width, `target ${i} width`).toBeGreaterThanOrEqual(min);
  }
}

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;
