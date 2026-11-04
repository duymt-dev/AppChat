# Thao tác xuyên DB (kernel/consistency) — TIP-045b annex A1

Action `db: 'platform'` ghi DB nền tảng và DB tenant. Hai DB không chung transaction, nên executor **không** lồng transaction tenant trong
transaction nền tảng nữa. Mỗi lệnh đi qua sổ `action_operation` (DB nền tảng):

| Pha | Ghi gì (một transaction) | Lỗi ngay sau pha |
|-----|--------------------------|------------------|
| `prepared` | dòng sổ: khoá unique(workspace, actor_key, idempotency_key), hash input đã che, ngữ cảnh khôi phục, binding duyệt AI | không có gì đã xảy ra — gửi lại chạy lại; khôi phục đánh `failed` (bỏ) |
| `platform_applied` | **nền tảng**: nghiệp vụ + đặt chỗ hạn mức (`quota_reservation`) + hiệu ứng ngoài (`platform_effect`, payload mã hoá) + `authz_epoch` khi quyền đổi + kế hoạch tenant | request trả **202 `operation_pending`** (không phải thành công); gửi lại cùng khoá / khôi phục áp tenant |
| `tenant_applied` | **tenant**: `applyTenant` + tiêu thụ duyệt + action_log + outbox + `operation_receipt` unique(operation_id) (+ `operation.completed` nếu có duyệt) | đã thành công — trả 200; xác nhận nền tảng do khôi phục làm |
| `complete` | **nền tảng**: `finalizePlatform` (route kênh / widget / ngân hàng) + chốt chỗ giữ `consumed` | — |

`failed` = bị từ chối tất định ở pha nền tảng (gửi lại trả đúng lỗi cũ). `compensation_required` = quá lượt khôi phục hoặc duyệt AI không
còn hợp lệ sau khi nền tảng đã áp; cần người / action được uỷ quyền xử lý. Không tự hoàn tác ẩn.

## Luật cho handler

- `execute(ctx, input, tx, ptx)`: `tx` là **tenant chỉ đọc** (`readOnlyTenant` — ghi → INTERNAL). Ghi tenant đưa vào `tenantPlan` (JSON,
  id tất định sinh ở đây, bí mật đã mã hoá) và làm ở `applyTenant(ctx, plan, tx)`. `applyTenant` không dựa vào `ctx.authz` (khôi phục không có
  quyền; quyền đã kiểm trước pha nền tảng) và phải chạy lại được (tìm theo id trước khi tạo).
- Ghi nền tảng phụ thuộc kết quả tenant (route…) để ở `finalizePlatform(ctx, plan, ptx, read)` — idempotent.
- Hạn mức tài nguyên tạo ở tenant (kênh, agent): khoá workspace → `assert(current + openReservations)` → `reserveQuota` trong `execute`.
- Quyền đổi (vai trò / gỡ thành viên / nhận lời mời / đổi chủ): `bumpAuthzEpoch(ptx, ws)` **cùng transaction**. `AuthzResolver` đọc
  `workspace.owner_user_id + authz_epoch` từ DB mỗi lần; cache Redis khoá theo epoch (chỉ để tăng tốc).
- Việc ngoài (thư…): trả `effects: [{ kind, payload, ttlMs }]`; domain đăng ký người gửi `registerEffectSender(kind, fn)`. Không gửi trong
  transaction; gửi lại không sinh token mới.
- Hoàn tác: `undoPlatform(ctx, log, ptx)` — thao tác nền tảng MỚI có điều kiện (khoá `undo:<log>`), không ghi PlatformDb từ tx tenant.

## Phân loại action hiện có

| Lớp | Action |
|-----|--------|
| Nền tảng thuần + biên nhận tenant | admin.invoice.confirm_transfer · billing.create_invoice · billing.cancel_invoice · billing.report_transfer · business_profile.update · integration.register_interest · invite.revoke · member.invite (thư = hiệu ứng) · member.remove (epoch) · member.set_role (epoch, undoPlatform) · notification.update_prefs · onboarding.toggle_step · profile.update · working_hours.update · workspace.switch · workspace.update |
| Giữ chỗ hạn mức / ghi tenant qua applyTenant | agent.create · agent.create_and_publish · channel.zalo.start_login · channel.email.connect · webchat.update_widget · bank_feed.connect · bank_feed.disconnect |
| Đọc | member.search |
| Chưa cài (NOT_IMPLEMENTED, TIP chủ) | wallet.update_alerts (039 — phải theo cùng giao thức khi cài) |

Kiểm: `packages/core/test/cross-db-handlers.test.ts` (phân loại + proxy chỉ đọc), `apps/api/test/integration/hardening-cross-db.test.ts`
(lỗi ở từng ranh giới pha trên hai DB thật).

## Khôi phục (ROLE=jobs)

`ConsistencyJobsModule` (nạp cùng `OutboxJobsModule`): lịch BullMQ `consistency-scheduler` mỗi 15 giây —
`consistency.recover` quét `action_operation_recovery_idx` (pha chưa xong, `next_attempt_at` đến hạn, bỏ thao tác < 30 giây để request tự làm
nốt), nhận lease + fence, chạy pha còn thiếu; lỗi → backoff, quá 12 lượt → `compensation_required`. `consistency.effects` gửi
`platform_effect` đến hạn (quá 8 lượt / hết hạn → `dead`, payload xoá).

Đối soát hằng giờ (annex E) là việc **báo cáo** riêng, không dùng đường khôi phục này.
