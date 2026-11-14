# TIP032b — kế hoạch commerce và review tích hợp

Chỉ tài liệu; chưa chạy runtime/QR/provider/DB.137 path manifest có M/C cụ thể,17 cặp overlap hai chiều, graph và domain boundaries cập nhật. Không claim full graph đã hết giao file vì023b/023c/030b/045b chưa có manifest đầy đủ.

## Hiện trạng đối chiếu

- quote-math.ts:23 threshold cứng; policy.ts servedConversation/autoSend exemptions không thay domain approval. FORCE_APPROVAL governance.ts:34 cần được áp, không chỉ hiển thị.
- invoice-doc QR chữ; quote-send.ts:68–77 MIME/PDF đơn; QuoteDrawer/DetailTabs chỉ Zalo/email. Cần ảnh đủ trang/format selector/webchat, không chỉ thêm enum.
- packages.ts:22–34 đọc Product hiện tại và unique order/product; snapshot order/item cần migration/writer và compatibility legacy.
- package.handlers.ts extend/undo đều đổi expiry, phải tăng revision reminder.
- catalog-read/order-import/order-write đều là consumer archived variant cần chặn dòng mới, không làm mất history.
- useAction.ts:39 trảnull cho202 khác preview, ActionAccepted chỉ hai loại;032b nhận job_accepted foundation cho importer,045b mở rộng sau để tránh dependency cycle.

## Review vòng1 và xử lý

Reviewer `/root/audit_remaining_requirements` xác nhận122 M/C paths ban đầu đúng filesystem nhưng chỉ ra thiếu integration:

1. Snapshot package thiếu sales-orders.prisma/order-write và legacy migration → đã nhận paths, snapshot flag/sessions/validDays/type, source_kind/partial unique legacy compatibility.
2. Expiry version thiếu extend/undo writer → nhận package.handlers.ts, stale revision suppression/tests.
3. Opaque public token thiếu platform locator → thêm platform commerce-links schema/migration, issuance after durable artifact/retry/no-send-before-route, hash lookup trước TenantDbResolver.
4. Quote send UI thiếu caller/modal/mock → nhận QuoteDrawer/DetailTabs/QuoteDeliveryModal/mock quotes, multi-page MIME/receipt/E2E.
5. Archived variants thiếu read/import/write consumers → nhận catalog-read/order-import/order-write, selection vs history contract.
6. Import status/results/cancel thiếu owner → ProductImportController/status service/schema, catalog module registration, action cancel/retry; unique(import_id,row_id), hash chỉ kiểm mismatch.
7. Matrix governance còn mơ hồ → đã ghi bảng action/authority/owner cụ thể, marketing bulk giữ037.

Các sửa đang chờ tái kiểm; không coi đã ghi patch là review PASS. Lệnh builder dùng API integration config và e2e:http đúng entrypoint, không chạy runtime trong pha docs. Standards review mới còn nghĩa vụ invoice/receipt template snapshot, split payment remainder, business-hour reminders/system action routing cần đối chiếu và bổ sung owner sau; chưa đánh các dòng đó đã được032b nhận.

## Independent re-review

Reviewer /root/audit_remaining_requirements confirmed all seven initial findings addressed in the 137-path plan; no M/C mismatch. This is local planning review only. Clarified public-token redaction excludes the authorized outgoing customer payload, which needs a functional link. Remaining unowned standards obligations: STD-documents-templates-2b, STD-domain-money-1.4, STD-domain-money-2.5, STD-documents-templates-6b. No runtime tests executed.
