# TIP-050 — Agent là nhân viên: rà `agentGrantable` của action đã có (Q-919, DC-923)

## HEADER
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `packages/actions/src/contract-appendix.ts`; integrate 003c before050.
- **Parallel-safe with TIP-003e (coverage-closure manifest):** sequential, shares `packages/actions/src/support.ts`; integrate 003e before050.
- **Parallel-safe with TIP-003f (coverage-closure manifest):** sequential, shares `packages/actions/src/crm.ts`; integrate 003f before050.
- **Parallel-safe with TIP-003i (coverage-closure manifest):** sequential, shares `packages/actions/src/registry.test.ts`; integrate 003i before050.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `packages/actions/src/payments.ts`; integrate 012b before050.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `packages/actions/src/marketing-extras.ts`, `packages/actions/src/marketing.ts`; integrate 012c before050.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `packages/actions/src/channel-operations.ts`, `packages/actions/src/inbox.ts`; integrate 014b before050.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `packages/actions/src/crm.ts`; integrate 015c before050.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `packages/actions/src/crm.ts`, `packages/actions/src/quotes.ts`; integrate 015d before050.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `packages/actions/src/crm.ts`; integrate 015e before050.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `packages/actions/src/crm.ts`; integrate 015f before050.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `packages/actions/src/kb-folders.ts`, `packages/actions/src/settings-ai.ts`; integrate 020b before050.
- **Parallel-safe with TIP-020c (coverage-closure manifest):** sequential, shares `packages/actions/src/inbox.ts`; integrate 020c before050.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `packages/actions/src/settings-ai.ts`; integrate 020e before050.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `fixtures/ai-eval/agent-channel-vertical.json`; integrate 022b before050.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `packages/actions/src/registry.test.ts`; integrate 023b before050.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `packages/actions/src/payments.ts`; integrate 023c before050.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `packages/actions/src/contracts.ts`, `packages/actions/src/crm.ts`, `packages/actions/src/inbox-aliases.ts`, `packages/actions/src/inbox-groups.ts`, `packages/actions/src/inbox.ts`, `packages/actions/src/quotes.ts`, `packages/actions/src/support.ts`; integrate 025b before050.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `packages/actions/src/contact-notes.ts`, `packages/actions/src/contact-tasks.ts`, `packages/actions/src/crm.ts`; integrate 026b before050.
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `packages/actions/src/booking.ts`, `packages/actions/src/quotes.ts`; integrate 026c before050.
- **Parallel-safe with TIP-027b (coverage-closure manifest):** sequential, shares `packages/actions/src/catalog.ts`; integrate 027b before050.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `packages/actions/src/contract-appendix.ts`, `packages/actions/src/contracts.ts`; integrate 030b before050.
- **Parallel-safe with TIP-030c (coverage-closure manifest):** sequential, shares `packages/actions/src/contracts.ts`; integrate 030c before050.
- **Parallel-safe with TIP-031b (coverage-closure manifest):** sequential, shares `packages/actions/src/contracts.ts`, `packages/actions/src/quotes.ts`; integrate 031b before050.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `packages/actions/src/catalog-operations.ts`, `packages/actions/src/catalog.ts`, `packages/actions/src/contracts.ts`, `packages/actions/src/quotes.ts`; integrate 032b before050.
- **Parallel-safe with TIP-032c (coverage-closure manifest):** sequential, shares `packages/actions/src/contracts.ts`; integrate 032c before050.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `packages/actions/src/booking.ts`; integrate 033b before050.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `packages/actions/src/support.ts`; integrate 034c before050.
- **Parallel-safe with TIP-036 (coverage-closure manifest):** sequential, shares `packages/actions/src/loyalty.ts`; integrate 036 before050.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `packages/actions/src/marketing-extras.ts`, `packages/actions/src/marketing.ts`; integrate 037 before050.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `packages/actions/src/settings-ai.ts`; integrate 039 before050.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `packages/actions/src/crm.ts`; integrate 045b before050.
- **Parallel-safe with TIP-047b (coverage-closure manifest):** sequential, shares `packages/actions/src/crm.ts`, `packages/actions/src/support.ts`; integrate 047b before050.
- **TIP-ID:** TIP-050 · **Project:** AppChat V2 · **Module:** Action Registry + Builder AI Agents · **Priority:** P1 · **Estimated:** M (1 pha)
- **Depends on:** mọi TIP chờ cũ có chung file (dòng khai hai phía ở trên) — trước 044, 045, 046.
- **Vì sao phụ thuộc:** đổi cờ trên file action dùng chung (`packages/actions/src/*.ts`); làm sau các TIP đang sửa cùng file để không đè. 044 (eval) chạy sau để có ca agent dùng tool mới.
- **Files touched:** [exact M/C manifest](manifests/TIP-050-files.md). Chỉ đổi dòng `agentGrantable` + test; không đổi permission, risk, handler.
- **Quyết định nguồn:** DC-921 / DC-922 (agent là nhân viên) · **DC-923** (Q-919 Chủ nhà "theo đề xuất" 2026-11-14) · D51 (Tools ở Builder) · D06 (duyệt) · Blueprint §3.3 (bảng nguồn × rủi ro).
- **Dòng COVERAGE nhận:** Q-919 · DC-923.

## CONTEXT
- **Working dir:** `D:/CODING/AppChat_Ver2`.
- **Hiện trạng (rà 2026-11-14 bằng script trên `packages/actions/src`; kiểm lại ở Rà):** 155 action risk `write` / `send` đang `agentGrantable: false`.
  - **64 action bật `true`** (bảng §1): thao tác nghiệp vụ trên một bản ghi, không bulk, không nội bộ, không cấu hình, không thuộc luật duyệt.
  - **87 action giữ `false`** (bảng §2), lý do theo nhóm. Ba action `contact_opportunity.*` (TIP-026c, DC-922) và `order.sync_now` (TIP-049, Q-917) xử lý ở TIP của chúng, không ở đây.
- `isAgentGrantable` (`packages/actions/src/define.ts` ~L71) = `agentGrantable && !internal`. Builder liệt kê Tools theo hàm này (D51). `agentAuthz` (`core/src/ai/agents/agent-authz.ts`) lấy permission từ tool đã cấp.
- Policy `kernel/actions/policy.ts`: agent `send` ngoài hội thoại đang phục vụ → duyệt; `delete` / `config` → cấm; `FORCE_APPROVAL_ACTIONS` luôn duyệt. Bật `agentGrantable` **không** nới các luật này.
- `template-revisions.ts` `invalidTemplateTools()` kiểm tool mặc định của mẫu ⊆ agentGrantable — không đổi bộ mặc định ở TIP này.

## APPLICABLE STANDARDS
- [actions/action-registry](../standards/actions/action-registry.md) — `agentGrantable` bắt buộc khai.
- [ai/agent-gateway](../standards/ai/agent-gateway.md) · [ai/eval](../standards/ai/eval.md) — tool agent; ca an toàn 100%.
- [authz/rbac-permissions](../standards/authz/rbac-permissions.md) — không đổi permission.
- [code/testing](../standards/code/testing.md) · [workflow/git-flow-ci](../standards/workflow/git-flow-ci.md).

## Rà trước khi làm
1. Rebase `origin/dev` mới nhất. `python -X utf8 tools/obligations/manifests.py 050`; tích hợp trước các TIP chung file.
2. Chạy lại script rà (đọc `defineAction` → `risk` / `agentGrantable` / `bulk` / `exposure` / `permission`, đối chiếu `FORCE_APPROVAL_ACTIONS`, `UI_ONLY_ACTIONS`, `LIFECYCLE_ACTIONS`). Action mới xuất hiện sau ngày rà → xếp theo luật §3, ghi report.
3. Với từng action §1: kiểm handler chạy đúng khi `actor.type = 'agent'` (không đọc `ctx.authz.userId` như người dùng thật, không cần phiên trình duyệt). Handler phụ thuộc người thật → giữ `false`, ghi lý do vào report (không sửa handler ở TIP này).

## TASK
Đổi `agentGrantable: false → true` cho các action nghiệp vụ một bản ghi (§1), giữ `false` có lý do cho phần còn lại (§2); khoá luật bằng test để action mới sau này khai đúng.

## SPECIFICATIONS

### 1. Bật `agentGrantable: true` (64 action)
| File | Action (risk) |
|---|---|
| `packages/actions/src/booking.ts` | `appointment.check_in` (write) · `appointment.complete` (write) · `appointment.mark_no_show` (write) |
| `packages/actions/src/catalog-operations.ts` | `product_variant.create` (write) · `product_variant.update` (write) · `product_variant.archive` (write) · `product.import_cancel` (write) · `product.import_retry` (write) |
| `packages/actions/src/catalog.ts` | `product.create` (write) · `product.update` (write) · `stock.adjust` (write) |
| `packages/actions/src/channel-operations.ts` | `channel_operation.cancel` (write) |
| `packages/actions/src/contact-notes.ts` | `contact.add_comment` (write) |
| `packages/actions/src/contact-tasks.ts` | `contact_task.create` (write) · `contact_task.update` (write) · `contact_task.set_state` (write) |
| `packages/actions/src/contract-appendix.ts` | `contract.appendix_request_changes` (write) |
| `packages/actions/src/contracts.ts` | `contract.request_changes` (write) · `contract.reject_internal` (write) |
| `packages/actions/src/crm.ts` | `contact.add_collaborator` (write) · `contact.remove_collaborator` (write) · `contact.request_access` (write) |
| `packages/actions/src/inbox-aliases.ts` | `conversation.unhide` (write) · `message.unpin` (write) · `message.unreact` (write) |
| `packages/actions/src/inbox-groups.ts` | `group.set_ai_policy` (write) · `group.add_members` (send) · `group.update` (send) · `group.set_mute` (send) · `group.refresh` (write) |
| `packages/actions/src/inbox.ts` | `conversation.mark_read` (write) · `conversation.add_assignee` (write) · `conversation.remove_assignee` (write) · `conversation.pin` (write) · `conversation.archive` (write) · `conversation.set_ai_mode` (write) · `message.recall` (send) · `message.react` (write) · `message.pin` (write) · `message.forward` (send) · `conversation.hide` (write) · `note.add` (write) |
| `packages/actions/src/kb-folders.ts` | `kb.folder.create` (write) · `kb.folder.update` (write) |
| `packages/actions/src/loyalty.ts` | `loyalty.attach_file` (write) |
| `packages/actions/src/marketing-extras.ts` | `segment.create` (write) · `segment.update` (write) · `campaign.analyze` (write) |
| `packages/actions/src/marketing.ts` | `campaign.create` (write) · `campaign.update` (write) · `campaign.submit` (write) · `campaign.send_test` (send) · `campaign.pause` (write) · `campaign.resume` (write) · `campaign.cancel` (write) |
| `packages/actions/src/payments.ts` | `package.extend` (write) · `package.adjust_sessions` (write) |
| `packages/actions/src/quotes.ts` | `quote.extend_validity` (write) · `quote.comment` (write) |
| `packages/actions/src/settings-ai.ts` | `kb.add_source` (write) · `kb.update_source` (write) · `kb.refresh_source` (write) |
| `packages/actions/src/support.ts` | `ticket.update` (write) · `ticket.reopen` (write) |

- Chỉ đổi cờ. `send` của agent ngoài hội thoại đang phục vụ vẫn qua duyệt (policy có sẵn).
- `campaign.send_test` (send): gửi thử tới chính người dùng / số test — giữ policy có sẵn.
- `message.recall` / `message.forward` / `group.*` (send): theo policy agent `send` (hội thoại đang phục vụ → chạy, nơi khác → duyệt).

### 2. Giữ `false` (87 action) — lý do theo nhóm
| Lý do | Action |
|---|---|
| việc cá nhân của người dùng | `onboarding.toggle_step` · `data_job.cancel` · `data_job.retry` · `transfer.plan` · `transfer.update_mapping` · `transfer.cancel` · `channel.group_result` · `notification.mark_read` · `profile.update` · `workspace.switch` · `kb.suggestion.propose` · `campaign.unsubscribe` · `campaign.dispatch` · `campaign.record_delivery` · `campaign.record_metric` · `campaign.store_analysis` · `notification.update_prefs` |
| internal | `billing.lifecycle_step` · `billing.apply_invoice` · `contract.appendix_public_otp` · `contract.appendix_public_sign` · `contract.appendix_public_decline` · `follow_up.reconcile` · `digest.dispatch` · `lead_routing.apply` · `loyalty.review_tier` · `privacy.cleanup_step` · `approval.system_expire` · `channel.system_transition` · `inbox.system_agent_transition` · `kb.system_publish` · `ticket.system_transition` |
| xuất dữ liệu | `package.export` · `quote.export` · `order.export` · `contract.export` · `ticket.export` · `product.export` · `invoice.export` · `contact_note.export` · `contact_task.export` · `contact_opportunity.export` |
| bulk | `product.import` · `contact.transfer_owner_bulk` · `contact.bulk_update` · `contact.merge` · `contact.import` · `transfer.commit` · `conversation.bulk_update` |
| bạn bè Zalo thủ công (Q-049) | `channel.friend.accept` · `channel.friend.reject` · `channel.friend.send` · `channel.friend.undo` · `channel.lookup_user` |
| chỉ Trợ lý | `assistant.discovery_prepare` · `assistant.attachment_prepare` · `assistant.attachment_remove` · `assistant.plan_propose` |
| quyết định duyệt (D06) | `approval.approve` · `approval.reject` · `approval.edit_and_approve` |
| gói / thanh toán | `billing.contact_sales` · `billing.cancel_invoice` · `billing.report_transfer` |
| force | `contract.appendix_send` · `contract.send_for_signature` · `payment.refund_reject` |
| tác vụ Cowork của người | `run.cancel` · `ai_task.run_now` |
| cấu hình kênh | `channel.sync_contacts` · `channel.sync_history` |
| ký hợp đồng (COMMERCE) | `contract.appendix_owner_otp` · `contract.request_sign_otp` |
| cấu hình kết nối | `integration.sync_now` · `integration.register_interest` |
| duyệt đề xuất tri thức do AI sinh | `kb.suggestion.approve` · `kb.suggestion.reject` |
| quản trị thành viên | `member.invite` · `invite.revoke` |
| thùng rác khách | `contact.restore` |
| quyết định chia sẻ dữ liệu khách | `contact.decide_access` |
| nhập hàng loạt | `campaign.audience_import` |
| gửi hàng loạt (D06) | `campaign.resend_unread` |
| bulk,force | `campaign.approve` |
| duyệt chiến dịch (D06) | `campaign.reject` |
| hàng loạt (Q-043: chưa khai bulk) | `ticket.bulk_update` |
| lifecycle | `workspace.open` |

- Nhóm "bạn bè Zalo thủ công" theo Q-049 (DC-923 b). Nhóm "hàng loạt / xuất / nhập / duyệt / ký / cấu hình" theo D06 + bảng §3.3 chung.

### 3. Luật cho action mới (test khoá)
- `packages/actions/src/registry.test.ts` thêm ca: mọi action risk `write` / `send`, không `bulk`, không `internal`, không trong `FORCE_APPROVAL_ACTIONS` / `UI_ONLY_ACTIONS` / `LIFECYCLE_ACTIONS`, permission không thuộc nhóm giữ (`self`, `assistant.use`, `approvals.decide`, `campaign.approve`, `contract.sign`, `payment.refund_approve`, `members.manage`, `billing.manage`, `channels.manage`, `integrations.manage`, `crm.export`, `crm.import`, `crm.delete`, `ai_task.manage`) → phải `agentGrantable: true`, trừ danh sách ngoại lệ có tên + lý do trong test (§2).
- Test lỗi in tên action + gợi ý "agent là nhân viên (DC-921 / 922 / 923) — bật true hoặc thêm ngoại lệ có lý do".

### 4. Builder + eval
- Builder tự hiện Tools mới theo module (không đổi FE). Kiểm `GET /v1/agents/:id/tools` có các action §1.
- Thêm 3 ca `fixtures/ai-eval/agent-channel-vertical.json`: agent dùng `appointment.check_in`, `contact_task.create`, `message.forward` (đích ngoài hội thoại → 202 chờ duyệt).

## ACCEPTANCE CRITERIA
| AC | Given / When / Then | Evidence |
|---|---|---|
| 1 | Given registry sau TIP, when `isAgentGrantable` cho 64 action §1, then `true`; 87 action §2 vẫn `false` | `pnpm --filter @appchat/actions test -- registry.test.ts` |
| 2 | Given action ghi mới khai `agentGrantable: false` không có ngoại lệ, when chạy test, then đỏ kèm tên action | `registry.test.ts` (ca giả) |
| 3 | Given agent được cấp `appointment.check_in` trực kênh, when gọi trong hội thoại đang phục vụ, then chạy; agent gọi `message.forward` sang hội thoại khác → 202 `approval_required` | `packages/core/test/agent-tools-grant.test.ts` |
| 4 | Given Builder, when mở Tools của agent, then nhóm module hiện action §1; action §2 không hiện | `apps/api/test/integration/agents-tools.test.ts` |
| 5 | Given bộ eval agent, when `pnpm ai:live --cases fixtures/ai-eval/agent-channel-vertical.json`, then 3 ca mới đạt (an toàn 100%) | report |

### Commands / evidence gate
- `pnpm turbo run lint typecheck test --filter=@appchat/{actions,core,api}` · `pnpm depcheck`.
- Integration (`--workers=1`, slot Postgres): `pnpm --filter @appchat/api test:integration -- test/integration/agents-tools.test.ts`.
- Eval: như AC5 (model thật cần key 9router — thiếu thì ghi "chưa nghiệm thu với provider thật").

## CONSTRAINTS
- **DO NOT:** đổi permission / risk / handler / policy; bật action §2; thêm Tools vào bộ mặc định của mẫu agent; đụng `FORCE_APPROVAL_ACTIONS`.
- **REUSE:** `isAgentGrantable`, `agentAuthz`, `policy.ts`, `invalidTemplateTools()`.
- **SKIP:** UI Builder (tự theo registry); mẫu agent mới.

## Quality Gate
- [x] Danh sách rà bằng script trên code thật 2026-11-14, người thi công chạy lại ở Rà #2.
- [x] Không nới duyệt D06 / §3.3; chỉ cờ cấp tool.
- **Gap:** handler phụ thuộc người thật (Rà #3) giữ `false` tới khi có TIP sửa handler.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Đúng manifest; chỉ đổi dòng `agentGrantable` + test.
- [ ] AC 1–5 có kết quả từng cái, dán output thật.
- [ ] **Action-first + D51:** quyền agent = Tools cấp ở Builder; policy §3.3 / D06 không đổi.
- [ ] Không báo DONE nếu test chưa chạy. `git status --short` sạch, báo kèm Git SHA.
