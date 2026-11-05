// Shape đọc trang Nền tảng kết nối (FE ↔ BE — gap-filling §5, TIP-012): `GET /v1/settings/integrations`.
// Mock transport (apps/web) và API thật parse cùng schema này.
import { z } from 'zod';

/** Metadata một ô form kết nối (TIP-023c G3, DEF-012-1) — từ manifest server, KHÔNG giá trị credential, không schema thực thi được. */
export const authFieldSchema = z.object({
  key: z.string(),
  secret: z.boolean(),
  optional: z.boolean(),
  type: z.enum(['string', 'email', 'url', 'number']),
  max: z.number().int().positive().optional(),
});
export type AuthFieldDto = z.infer<typeof authFieldSchema>;

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
  /** Metadata có kiểu của `fields` (cùng thứ tự) — giữ `fields` string[] cho client cũ. */
  auth: z.array(authFieldSchema).optional(),
  interest: z.boolean(),
});
export type ConnectorDto = z.infer<typeof connectorSchema>;

export const connectorListSchema = z.array(connectorSchema);
