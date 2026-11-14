# Kết nối bên thứ 3 — Ports & Adapters + Connector Registry

> Mục tiêu: thêm SePay, Casso, MISA, Mắt Bão, VNPT, Viettel, FPT, KiotViet, Google Sheets… = **thêm một adapter + manifest**. Core chỉ biết **port** (interface theo năng lực), không biết tên nhà cung cấp.
> Trang Cài đặt → **Nền tảng kết nối** (prototype L6218) **bật ở P0**. Trang hiện connector đã có adapter. Connector chưa có adapter hiện thẻ **"Sắp có"** (Chủ nhà chốt 2026-10-28, RRI D28).

## Quy tắc

1. **Port theo năng lực, không theo hãng.** Mỗi port là một interface trong `packages/integrations/src/ports/`:

| Port | Dùng cho | Adapter phát hành | Adapter ứng viên (Sắp có) |
|---|---|---|---|
| `BankFeedProvider` | đối soát chuyển khoản (thu phí AppChat + tiền khách của DN) | **SePay** (chính), Casso, `mock` | API ngân hàng trực tiếp |
| `EInvoiceProvider` | hoá đơn điện tử (NĐ 123/2020, NĐ 70/2025) | `mock` | **MISA meInvoice, Mắt Bão (M-Invoice), VNPT Invoice, Viettel S-Invoice, EasyInvoice, FPT** |
| `ESignProvider` | ký số CA cho hợp đồng | `appchat_native` (ký điện tử OTP) | VNPT-CA, Viettel-CA, FPT-CA, MISA eSign |
| `TaxLookupProvider` | tra cứu MST khi khai báo DN | **VietQR**, `mock` | — |
| `MailProvider` | email hệ thống (OTP, thông báo) | **Brevo** (D34), SMTP dự phòng | Mailgun, SES |
| `StorageProvider` | file | `local`, `s3` | Google Cloud Storage |
| `LlmProvider` | LLM (nền tảng, không phải của workspace) | Anthropic, OpenAI, Google, DeepSeek + **mọi router OpenAI-compatible** (OpenRouter, 9router, LiteLLM, vLLM) qua AI SDK — D33 | — |
| `AccountingSyncProvider` | đồng bộ đơn / công nợ sang kế toán | — | MISA AMIS, Fast, Odoo |
| `CommerceSyncProvider` | đồng bộ sản phẩm / tồn | — | KiotViet, Sapo, Haravan, WooCommerce |
| `OrderSyncProvider` | kéo đơn từ sàn / POS (webhook + poll), đọc sản phẩm để ghép SKU, đẩy trạng thái (P2) — D31 | `mock`, **Shopee, TikTok Shop** (D63) | Sapo, Lazada, Haravan, KiotViet, WooCommerce |
| `SheetSyncProvider` | xuất / đồng bộ bảng | — | Google Sheets |
| `SmsProvider` | SMS (P2) | — | Viettel, VNPT, eSMS, Twilio |

2. **Mỗi adapter có `ConnectorManifest`.** Trang Nền tảng kết nối, form kết nối, nhóm, logo và trạng thái đều đọc manifest. Nhóm theo prototype: Kênh & Studio · Marketing · CRM · TMĐT · Thanh toán · Năng suất · ERP & Vận hành.
3. **Mỗi workspace một bản ghi kết nối** `integration_connection(id, connector_key, port, status, config jsonb, secret_enc bytea, last_sync_at, last_error)` trong DB tenant. **D63:** connector sàn cho phép nhiều kết nối (mỗi shop một bản ghi, `external_account_id` = shop_id); token OAuth ở `oauth_grant` (TokenVault), không ở `secret_enc`.
   - Secret mã hoá AES-256-GCM, không trả về API.
   - Webhook vào → tra `tenant_integration_route(connection_id → ws)` ở DB nền tảng.
   - Kết nối của nền tảng (SePay cho thu phí AppChat, SMTP hệ thống, LLM key) cấu hình ở DB nền tảng / env, không ở workspace.
4. **Core gọi qua `IntegrationResolver.get(ws, port)`.** Workspace chưa kết nối thì trả `null`, hoặc adapter mặc định (`mock` / native). Nghiệp vụ phải chạy được khi chưa có connector, ví dụ không có hoá đơn điện tử thì chỉ có Đề nghị thanh toán.
5. **Gọi ra ngoài luôn chạy bất đồng bộ** qua BullMQ queue `integrations`: retry back-off, idempotency key `(connection_id, op, ref_id)`, dead-letter. Mỗi lần gọi ghi `integration_call_log` (op, ref, status, latency, error — **không** ghi secret và payload nhạy cảm).
6. **Webhook vào:**
   - Route chung `/hooks/integrations/:connector/:connectionId`.
   - Kiểm chữ ký / secret **trong adapter**.
   - Insert sự kiện thô idempotent theo id của provider.
   - Trả 200 nhanh; xử lý trong queue.
7. **Mapping dữ liệu** (đơn → hoá đơn điện tử, sản phẩm ↔ SKU bên ngoài) lưu ở `integration_mapping(connection_id, entity, local_id, external_id)`. Không thêm cột `misa_id` vào bảng nghiệp vụ.
8. **Action-first:**
   - Kết nối / ngắt / đồng bộ là action: `integration.connect`, `integration.disconnect`, `integration.sync_now`, `einvoice.issue`, `einvoice.cancel`…
   - Quyền `integrations.manage`.
   - Việc chạm tiền hoặc pháp lý (phát hành hoá đơn, huỷ hoá đơn) có risk `money`.
9. **Sandbox trước:** adapter phải hỗ trợ `mode: 'sandbox' | 'live'`. Test contract chạy bằng `mock` + fixture. Test live chỉ chạy khi có biến `INTEG_LIVE_<KEY>=1`.

## Đồng bộ đơn (D31)

- `OrderSyncProvider.pull(conn, cursor)` → `{ orders, nextCursor, done }` (D63 — theo trang, chạy ở hàng đợi, không trong request; cửa sổ đầu `initial_days`) / `handleWebhook()` → `ExternalOrder` chuẩn hoá (buyer, lines, totals, platform_status, paid, shipping). Core gọi `order.import_external` (`source = system`), idempotent theo `(external_shop_key, external_id)` (D63; trước là `(connection_id, external_id)` — nối lại tạo trùng).
- **D63:** `getTracking?` (mã vận đơn chỉ đọc; rỗng thì giữ giá trị cũ), `listProducts?(conn, cursor)` (đọc sản phẩm / giá / biến thể để ghép SKU — không đẩy lên sàn). Webhook sàn mức App `/hooks/marketplace/:connector`, tra `tenant_shop_route`.
- Adapter cung cấp `mapStatus(platform_status) → { status, pay_status }`. Core không biết trạng thái riêng của sàn.
- `integration_connection.config.stock_master = 'appchat' | 'external'`; `config.loyalty_enabled` mặc định `false`.
- Quy tắc nghiệp vụ: COMMERCE-DECISIONS §4b.

## Hợp đồng

```ts
// packages/integrations/src/types.ts
export interface ConnectorManifest {
  key: string;                      // 'sepay' | 'casso' | 'misa_meinvoice' | 'matbao_minvoice' | 'vnpt_invoice' | ...
  port: PortKey;                    // 'bank_feed' | 'einvoice' | 'esign' | ...
  name: string; logo: string;
  group: 'channels_studio' | 'marketing' | 'crm' | 'commerce' | 'payments' | 'productivity' | 'erp';
  status: 'ga' | 'beta' | 'coming_soon';
  auth: { kind: 'api_key' | 'oauth2' | 'basic' | 'certificate'; fields: z.ZodObject<any> };
  webhooks?: boolean; modes: Array<'sandbox' | 'live'>;
  docsUrl?: string;
}
// ví dụ port
export interface EInvoiceProvider {
  issue(conn: Conn, draft: EInvoiceDraft): Promise<{ externalId: string; number: string; lookupCode: string; pdfUrl?: string; xmlUrl?: string }>;
  cancel(conn: Conn, externalId: string, reason: string): Promise<void>;
  status(conn: Conn, externalId: string): Promise<EInvoiceStatus>;
}
// packages/integrations/src/registry.ts — DUY NHẤT nơi liệt kê connector
export const connectorRegistry = defineConnectors([sepay, casso, smtp, s3, /* coming_soon: */ misaMeInvoice, matbaoMInvoice, vnptInvoice, viettelSInvoice, kiotviet, googleSheets, ...]);
```

## Trang Nền tảng kết nối (UI)

- Bố cục, nhóm, thẻ, thống kê theo prototype L6218 + logic `integCats` / `integGroups`. Parity < 5% với các thẻ có thật.
- Thẻ `coming_soon` có badge "Sắp có" và nút "Đăng ký quan tâm" (ghi `integration_interest`, cho đội AppChat biết nhu cầu); không mở form kết nối.
- Danh sách connector trong prototype (Tổng đài, Brevo, SMS…, KiotViet, Odoo, Fast) **chỉ hiện nếu có manifest**. Connector thuộc module OUT (Tổng đài) thì không có manifest. Danh sách thẻ hiển thị là ngoại lệ parity có ghi tên.

## Lý do

- Chủ nhà yêu cầu chừa sẵn kết nối SePay, MISA, Mắt Bão…
- COMMERCE-DECISIONS Q2 / Q3 / C1 đã chốt dùng port `EInvoiceProvider`, `BankFeedProvider`, `ESignProvider`.
- Tách theo port giúp thay hoặc thêm nhà cung cấp mà không sửa nghiệp vụ.
