// Shape đọc trang Nền tảng kết nối (FE ↔ BE — gap-filling §5, TIP-012): `GET /v1/settings/integrations`.
// Mock transport (apps/web) và API thật parse cùng schema này.
import { z } from 'zod';

export const connectorSchema = z.object({
  key: z.string(),
  name: z.string(),
  group: z.enum(['channels_studio', 'marketing', 'crm', 'commerce', 'payments', 'productivity', 'erp']),
  color: z.string(),
  status: z.enum(['ga', 'beta', 'coming_soon']),
  connected: z.boolean(),
  /** Thẻ mở một mục Cài đặt thay vì hộp kết nối (Trợ lý AI → web_widget — DC-006). */
  opens: z.string().nullable(),
  /** Key trường form theo manifest.auth.fields. */
  fields: z.array(z.string()),
  interest: z.boolean(),
});
export type ConnectorDto = z.infer<typeof connectorSchema>;

export const connectorListSchema = z.array(connectorSchema);
