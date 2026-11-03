# TIP-012d — Connector storage phát hành (S3-compatible) cho tệp workspace

## HEADER
- TIP-ID: TIP-012d; Project: AppChat V2; Module: integrations storage; Priority: P1; Estimated: M. TIP bổ sung cho TIP-012 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 045b (adapter S3 platform + file security + `kernel/http/safe-fetch.ts`) đã tích hợp; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-012d-files.md) — 15 paths (10 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-003e (coverage-closure manifest):** sequential, shares `packages/db/prisma/tenant/kernel.prisma`; integrate 003e before012d.
- **Parallel-safe with TIP-003b (coverage-closure manifest):** sequential, shares `packages/db/prisma/tenant/kernel.prisma`; integrate 003b before012d.
- **Parallel-safe with TIP-006b (coverage-closure manifest):** sequential, shares `packages/db/prisma/tenant/kernel.prisma`; integrate 006b before012d.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `packages/integrations/src/registry.ts`; integrate 012b before012d.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `packages/integrations/src/registry.ts`; integrate 012c before012d.
- **Dòng COVERAGE nhận:** D28c; REQ-M03b; BP-8-e.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - `packages/core/src/kernel/files/storage.ts:1–2` chỉ `LocalStorage`, ghi "s3 để sau"; thẻ GCS ở Nền tảng kết nối là "Sắp có". 045b (chờ) tạo `s3-storage.ts` + `storage-config.ts` cấp platform qua env — TIP này KHÔNG viết lại adapter.
  - REQ-M03b (dòng sổ: connector phát hành chạy thật) — SePay/Casso thuộc 012b; SMTP đạt; **storage** thuộc TIP này.

## APPLICABLE STANDARDS
- integrations/provider-ports.md; ops/observability-security.md (credentials_enc, SSRF/safeFetch L27); Blueprint §11 object storage.
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 012d` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Đọc `s3-storage.ts`/`storage-config.ts` + `safe-fetch.ts` của 045b đã tích hợp; chỉ thêm lớp chọn bucket theo workspace; một port storage duy nhất (`packages/integrations/src/ports/storage.ts`) là nguồn kiểu cho cả platform và workspace — `kernel/files/storage.ts` dùng kiểu đó, không khai kiểu thứ hai.

## TASK
Connector storage S3-compatible theo workspace (dùng adapter platform của 045b), có kiểm tra kết nối và di chuyển tệp — connector storage phát hành của D28/REQ-M03.

## SPECIFICATIONS
### 1. Connector
1. Connector `storage_s3` theo workspace (credentials_enc: endpoint, region, bucket, key) dùng `S3Storage` của 045b; tệp mới của workspace ghi vào bucket đó, khoá giữ dạng `<ws>/<yyyy>/<mm>/<file_id>`; bảng `file.storage_ref` ghi nơi lưu để đọc tệp cũ vẫn đúng.
### 2. An toàn endpoint (SSRF)
1. Endpoint do workspace nhập bắt buộc `https`; resolve DNS rồi chặn private/loopback/link-local/metadata (169.254.169.254) và cổng nội bộ (5432, 6379…) theo chính sách `safeFetch` của 045b; không follow redirect; timeout 10s — áp cho probe, put/get và job di chuyển (kiểm lại mỗi lần kết nối, chống DNS rebinding).
### 3. Sao lưu (DC-294)
1. Bucket do workspace sở hữu: sao lưu/phiên bản hoá là trách nhiệm chủ bucket; 045 không đọc bucket khách bằng credential khách. UI connector ghi rõ điều này; tệp ở storage platform vẫn thuộc backup 045.
### 4. Vận hành
1. `integration.test` probe put/head/delete khoá tạm; di chuyển local→S3 bằng job theo lô, idempotent theo sha256.
### 5. Port còn thiếu
1. Thêm port kiểu (không adapter) `EInvoice`, `ESign`, `AccountingSync`, `SheetSync`, `Sms` trong `packages/integrations/src/ports` để registry/thẻ "Sắp có" khai năng lực đúng chuẩn; adapter thật là P2 (REQ-M03b ghi P2).

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|Endpoint `http://127.0.0.1:5432`, `https://169.254.169.254`, tên miền resolve về 10.x|bị từ chối trước khi gửi request — unit|
|2|MinIO native (không Docker) hoặc endpoint test|put/get/delete đúng — integration có điều kiện env|
|3|Probe sai key|lỗi rõ, không lộ secret|
|4|Di chuyển 1.000 tệp, ngắt giữa chừng|chạy lại không trùng|
|5|Registry|mọi thẻ "Sắp có" trỏ tới port có kiểu|

### Commands / evidence gate
- `pnpm --filter @appchat/core test -- test/workspace-storage.test.ts`
- `pnpm --filter @appchat/api test:integration -- test/integration/storage-connector.test.ts`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Thiếu bucket thật → ghi "chưa nghiệm thu với provider thật" (Q-006).
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 15 path, header khai hai phía, 5 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
