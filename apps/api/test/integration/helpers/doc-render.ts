// Chạy job `doc-render` THẬT (TIP-028b — như worker ROLE=jobs, không qua Redis) cho mọi dòng `pending_render` của workspace: runRender
// (render LibreOffice → tệp id tất định → phát hành trong transaction) với lượt cuối, rồi trả tin gửi khách đã ghi. Test cần PDF / tin
// sau `quote.send` gọi helper này — API chỉ ghi yêu cầu render (AC1).
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { RENDER_ATTEMPTS, runRender } from '@appchat/core';
import type { Harness } from '../setup';

export async function drainRenders(h: Harness, resolver: TenantDbResolver, o: { attempt?: number } = {}) {
  const db = await resolver.get(TenantContexts.system(h.ws, 'doc-render-drain'));
  const rows = await db.documentRender.findMany({ where: { status: 'pending_render' }, orderBy: { createdAt: 'asc' } });
  const out = [];
  for (const r of rows) out.push(await runRender(db, { ws: h.ws, render_id: r.id, generation: r.generation }, o.attempt ?? RENDER_ATTEMPTS, () => h.clock.now()));
  return out;
}
