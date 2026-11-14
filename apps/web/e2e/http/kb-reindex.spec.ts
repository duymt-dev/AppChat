// TIP-020e AC8 — E2E chế độ http (pnpm e2e:http kb-reindex, worker ROLE=ai thật, embedding giả AI_ENGINE=mock): tải tài liệu → worker nạp
// (khe A, space của route embed hiện hành). Giả lập "model của chỉ mục đã gỡ" bằng cách đổi space của khe đang phục vụ ở DB tenant (bản build
// mock chỉ có MỘT route embed — không đổi route qua UI được) → Dữ liệu RAG hiện thẻ suy giảm + "Tạo lại chỉ mục" → thẻ xác nhận có ước tính
// (xem trước bắt buộc ở server) → xác nhận → worker ai chạy generation thật → publish → thẻ biến mất; API báo chỉ mục hiện hành.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

const ROOT = join(import.meta.dirname, '..', '..', '..', '..');
const BODY = Buffer.from('# Bảo hành\n\nMáy lọc nước được bảo hành 12 tháng tại cửa hàng, đổi mới trong 7 ngày đầu nếu lỗi nhà sản xuất.\n', 'utf8');
const OLD = 'mock:old-embed:1536:';

/** GET /settings/kb của workspace hiện tại qua API thật (không tin UI). */
const kbOf = (page: Page) =>
  page.evaluate(async () => {
    const t = ((await (await fetch('/api/v1/auth/refresh', { method: 'POST' })).json()) as { data: { access_token: string } }).data.access_token;
    const ws = ((await (await fetch('/api/v1/session', { headers: { authorization: `Bearer ${t}` } })).json()) as { data: { workspace_id: string } }).data.workspace_id;
    const kb = (await (await fetch('/api/v1/settings/kb?nav=all', { headers: { authorization: `Bearer ${t}`, 'x-workspace-id': ws } })).json()) as {
      data: { data: { status: string; learned: boolean }[]; index?: { state: string; phase: string | null; degraded?: string | null } };
    };
    return { ws, kb: kb.data };
  });

/** Đổi space của khe đang phục vụ sang model "đã gỡ" (script node + pg của gói db; ngắt kết nối ngay). */
function retireActiveSpace(ws: string) {
  const db = `ws_${ws.replace(/-/g, '').slice(-12).toLowerCase()}`;
  const code = `
    const fs = require('fs'); const pg = require('pg');
    const env = Object.fromEntries(fs.readFileSync(${JSON.stringify(join(ROOT, '.env'))}, 'utf8').split(/\\r?\\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL.replace(/\\/[^/?]*(\\?|$)/, '/${db}$1') });
    (async () => {
      await c.connect();
      try {
        await c.query("UPDATE kb_setting SET active_space = $1, index_state = 'current' WHERE id = 1", ['${OLD}']);
        await c.query('UPDATE kb_chunk SET embed_space_a = $1 WHERE embed_space_a IS NOT NULL', ['${OLD}']);
      } finally { await c.end(); }
    })().catch((e) => { console.error(e.message); process.exit(1); });`;
  const r = spawnSync(process.execPath, ['-e', code], { cwd: join(ROOT, 'packages', 'db'), encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`retireActiveSpace: ${r.stderr}`);
}

test.describe('tạo lại chỉ mục kho tri thức (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('model khe đang phục vụ đã gỡ → suy giảm → tạo lại (xem trước có ước tính) → worker publish → chỉ mục hiện hành', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(150_000);
    await onboarded(page, 'kbre');
    await page.goto('/settings/rag_data');
    // Chỉ mục rỗng / hiện hành → không có thẻ.
    await expect(page.getByTestId('st-rag')).toBeVisible();
    await expect(page.getByTestId('st-rag-index')).toHaveCount(0);

    await page.getByTestId('st-rag-upload').click();
    const m = page.getByTestId('st-rag-modal');
    await m.getByTestId('st-rag-file').setInputFiles({ name: 'Bảo hành.md', mimeType: 'text/markdown', buffer: BODY });
    await m.getByTestId('st-rag-modal-save').click();
    await expect(m).toHaveCount(0);
    await expect.poll(async () => (await kbOf(page)).kb.data.every((d) => d.status === 'ready'), { timeout: 45_000 }).toBe(true);

    const { ws } = await kbOf(page);
    retireActiveSpace(ws);
    await page.reload();
    const card = page.getByTestId('st-rag-index');
    await expect(card).toHaveAttribute('data-state', 'embed_space_retired');
    await expect(card).toContainText('chỉ tìm theo từ khoá');

    await page.getByTestId('st-rag-index-reindex').click();
    const dlg = page.getByRole('dialog');
    await expect(dlg.locator('[data-warning="kb_reindex_old_slot_serves"]')).toBeVisible();
    await expect(dlg).toContainText('mock · mock-embed');
    await dlg.getByRole('button', { name: 'Xác nhận' }).click();

    // Worker ai chạy generation thật → publish → hết suy giảm; thẻ biến mất (poll 5s khi đang chạy).
    await expect.poll(async () => (await kbOf(page)).kb.index, { timeout: 60_000 }).toMatchObject({ state: 'current', phase: null, degraded: null });
    await page.reload();
    await expect(page.getByTestId('st-rag')).toBeVisible();
    await expect(page.getByTestId('st-rag-index')).toHaveCount(0);
  });
});
