# Standards Index

> Sinh bởi `/vibecode:scan --standards` (2026-10-28). Builder **phải** đọc các standard áp dụng cho TIP trước khi code. Blueprint và BUILDER-HANDOFF tham chiếu tới bảng này.

| Area | Standard | Description |
|------|----------|-------------|
| actions | [action-registry](actions/action-registry.md) | Action-first: một đường ghi duy nhất, thứ tự Executor, preview / undo / governance, test bắt buộc |
| ai | [agent-gateway](ai/agent-gateway.md) | `packages/ai` là cổng LLM duy nhất, tool = action, run lưu DB rồi chạy tiếp, rào chắn, credit, prompt có version |
| ai | [eval](ai/eval.md) | Bộ ca eval cố định, replay mọi PR + live gated, ngưỡng (an toàn 100%) |
| api | [response-envelope](api/response-envelope.md) | `{data}` / `{error:{code}}`, cursor, mã HTTP, Idempotency-Key, contract zod |
| authz | [rbac-permissions](authz/rbac-permissions.md) | Permission engine + 5 vai trò mặc định + data scope own / team / all; AI chạy theo quyền người ra lệnh (D27) |
| channels | [omnichannel-adapter](channels/omnichannel-adapter.md) | ChannelAdapter + manifest + registry: thêm kênh không sửa core |
| code | [file-size-module-layout](code/file-size-module-layout.md) | Trần 600 (BE) / 400 (FE), bố cục domain, import một chiều |
| code | [testing](code/testing.md) | Các tầng test, test cô lập tenant + role, DB thật, báo kết quả trung thực + commit SHA |
| database | [indexing](database/indexing.md) | Thứ tự composite, INCLUDE, deferred join, cursor, partial / expression index, index cho scope |
| database | [tenant-db](database/tenant-db.md) | Mỗi workspace một DB, 2 Prisma client, không FK xuyên DB, migration expand-compatible |
| events | [outbox](events/outbox.md) | Transactional outbox, relay qua dirty set, consumer idempotent |
| i18n | [i18n](i18n/i18n.md) | next-intl + ICU, không chuỗi cứng, helper fmt, lỗi theo code, AI theo locale |
| integrations | [provider-ports](integrations/provider-ports.md) | Port theo năng lực + ConnectorManifest + registry; SePay / Casso / MISA / Mắt Bão / VNPT / Viettel…; trang Nền tảng kết nối có thẻ "Sắp có" (D28) |
| ui | [prototype-parity](ui/prototype-parity.md) | Playwright 1440×900, maxDiffPixelRatio 0.05, manifest + fixture + danh sách ngoại lệ |
