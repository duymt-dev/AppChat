// Render PDF chứng từ phát hành (TIP-028b §1, queue `doc-render` ROLE=jobs): payload CHỈ id + thế hệ — dòng `document_render` mới là việc
// chờ có thẩm quyền (mất sự kiện thì vòng quét khôi phục). Không tên tệp / nội dung / URL / lỗi thô.
import { z } from 'zod';

const base = { ws: z.string().uuid(), occurred_at: z.string(), render_id: z.string().uuid(), kind: z.string().max(40), document_id: z.string().uuid(), generation: z.number().int() };

export const documentRenderRequestedEvent = z.object(base);
export const documentRenderedEvent = z.object(base);
export const documentRenderFailedEvent = z.object({ ...base, error: z.string().max(80) });

export const DOCUMENT_RENDER_EVENT_SCHEMAS = {
  'document.render_requested': documentRenderRequestedEvent,
  'document.rendered': documentRenderedEvent,
  'document.render_failed': documentRenderFailedEvent,
} as const;
