# TIP-050 — exact file manifest

M = sửa, C = tạo mới. Chỉ đổi dòng `agentGrantable` trong file action.

Không dùng wildcard thư mục; test liệt kê từng file.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/actions/src/booking.ts` | `agentGrantable: true` cho `appointment.check_in`, `appointment.complete`, `appointment.mark_no_show` |
| M | `packages/actions/src/catalog-operations.ts` | `agentGrantable: true` cho `product_variant.create`, `product_variant.update`, `product_variant.archive`, `product.import_cancel`, `product.import_retry` |
| M | `packages/actions/src/catalog.ts` | `agentGrantable: true` cho `product.create`, `product.update`, `stock.adjust` |
| M | `packages/actions/src/channel-operations.ts` | `agentGrantable: true` cho `channel_operation.cancel` |
| M | `packages/actions/src/contact-notes.ts` | `agentGrantable: true` cho `contact.add_comment` |
| M | `packages/actions/src/contact-tasks.ts` | `agentGrantable: true` cho `contact_task.create`, `contact_task.update`, `contact_task.set_state` |
| M | `packages/actions/src/contract-appendix.ts` | `agentGrantable: true` cho `contract.appendix_request_changes` |
| M | `packages/actions/src/contracts.ts` | `agentGrantable: true` cho `contract.request_changes`, `contract.reject_internal` |
| M | `packages/actions/src/crm.ts` | `agentGrantable: true` cho `contact.add_collaborator`, `contact.remove_collaborator`, `contact.request_access` |
| M | `packages/actions/src/inbox-aliases.ts` | `agentGrantable: true` cho `conversation.unhide`, `message.unpin`, `message.unreact` |
| M | `packages/actions/src/inbox-groups.ts` | `agentGrantable: true` cho `group.set_ai_policy`, `group.add_members`, `group.update`, `group.set_mute`, `group.refresh` |
| M | `packages/actions/src/inbox.ts` | `agentGrantable: true` cho `conversation.mark_read`, `conversation.add_assignee`, `conversation.remove_assignee`, `conversation.pin`, `conversation.archive`, `conversation.set_ai_mode`, `message.recall`, `message.react`, `message.pin`, `message.forward`, `conversation.hide`, `note.add` |
| M | `packages/actions/src/kb-folders.ts` | `agentGrantable: true` cho `kb.folder.create`, `kb.folder.update` |
| M | `packages/actions/src/loyalty.ts` | `agentGrantable: true` cho `loyalty.attach_file` |
| M | `packages/actions/src/marketing-extras.ts` | `agentGrantable: true` cho `segment.create`, `segment.update`, `campaign.analyze` |
| M | `packages/actions/src/marketing.ts` | `agentGrantable: true` cho `campaign.create`, `campaign.update`, `campaign.submit`, `campaign.send_test`, `campaign.pause`, `campaign.resume`, `campaign.cancel` |
| M | `packages/actions/src/payments.ts` | `agentGrantable: true` cho `package.extend`, `package.adjust_sessions` |
| M | `packages/actions/src/quotes.ts` | `agentGrantable: true` cho `quote.extend_validity`, `quote.comment` |
| M | `packages/actions/src/settings-ai.ts` | `agentGrantable: true` cho `kb.add_source`, `kb.update_source`, `kb.refresh_source` |
| M | `packages/actions/src/support.ts` | `agentGrantable: true` cho `ticket.update`, `ticket.reopen` |
| M | `packages/actions/src/registry.test.ts` | Luật: action ghi một bản ghi phải `agentGrantable: true` trừ ngoại lệ có lý do (§3) |
| C | `packages/core/test/agent-tools-grant.test.ts` | AC3: agent gọi action vừa bật — chạy / chờ duyệt theo policy |
| C | `apps/api/test/integration/agents-tools.test.ts` | AC4: Builder Tools hiện action §1, ẩn §2 |
| M | `fixtures/ai-eval/agent-channel-vertical.json` | AC5: 3 ca agent dùng tool mới |
