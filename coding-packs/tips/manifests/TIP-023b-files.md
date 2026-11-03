# TIP-023b — exact file manifest

M = modify existing; C = create. Static inventory at 2026-11-02; paths checked against filesystem. All 578 paths below belong to TIP023b; no wildcard authorizes other files. This is a cross-domain action-coverage pack: implement in ordered domain batches, preserving shared contracts. Tests are separate per action, not embedded in production files.

Legacy parity.manifest.ts: only 1–2-line facade to manifests/assistant-coverage.ts. Preview logic lives in per-handler helpers; existing handlers only delegate. Do not combine all previews or all action fixtures into one implementation file; the matrix fixture indexes domain fixtures/test-local seeds, it is not a giant test suite. At build preflight remeasure line caps and amend manifest before any additional split.

| Mode | Path | Purpose |
|---|---|---|
| M | `packages/core/src/index.ts` | Export GroupRequests read facade and runtime composition interfaces |
| M | `packages/shared/src/index.ts` | Export assistant/group DTOs through public barrel |
| M | `packages/shared/src/api/index.ts` | Export conversation-groups schema |
| M | `packages/ai/src/prompts/index.ts` | Runtime prompt registry synchronized with Markdown |
| M | `apps/api/src/http/ai/ai.controller.ts` | Pass authority to shared scoped listRuns query |
| C | `packages/ai/test/assistant-prompt-runtime.test.ts` | Runtime prompt version/content matches approved prompt changes |
| C | `coding-packs/reports/TIP-023b-completion.md` | Builder evidence report only after implementation |
| M | `apps/api/src/http/inbox/inbox.http.module.ts` | Canonical paused state and group HTTP registration |
| M | `packages/core/src/ai/assistant/sessions.ts` | Canonical paused state and group HTTP registration |
| M | `packages/ai/src/gateway/engine.ts` | Canonical paused state and group HTTP registration |
| M | `packages/ai/src/gateway/messages.ts` | Canonical paused state and group HTTP registration |
| C | `packages/ai/test/canonical-pause.test.ts` | Canonical input survives engine pause/replay without leaking metadata |
| M | `apps/api/src/http/ai/assistant.controller.ts` | Runtime/contract/wiring |
| C | `apps/api/src/http/inbox/group-requests.controller.ts` | Explicit integration seam |
| C | `apps/api/test/integration/actions/admin.invoice.confirm_transfer.action.test.ts` | Per-action matrix: admin.invoice.confirm_transfer |
| C | `apps/api/test/integration/actions/agent.create_and_publish.action.test.ts` | Per-action matrix: agent.create_and_publish |
| C | `apps/api/test/integration/actions/agent.create.action.test.ts` | Per-action matrix: agent.create |
| C | `apps/api/test/integration/actions/agent.delete.action.test.ts` | Per-action matrix: agent.delete |
| C | `apps/api/test/integration/actions/agent.draft_from_description.action.test.ts` | Per-action matrix: agent.draft_from_description |
| C | `apps/api/test/integration/actions/agent.optimize_prompt.action.test.ts` | Per-action matrix: agent.optimize_prompt |
| C | `apps/api/test/integration/actions/agent.pause.action.test.ts` | Per-action matrix: agent.pause |
| C | `apps/api/test/integration/actions/agent.publish.action.test.ts` | Per-action matrix: agent.publish |
| C | `apps/api/test/integration/actions/agent.rollback.action.test.ts` | Per-action matrix: agent.rollback |
| C | `apps/api/test/integration/actions/agent.search.action.test.ts` | Per-action matrix agent.search |
| C | `apps/api/test/integration/actions/agent.test.action.test.ts` | Per-action matrix: agent.test |
| C | `apps/api/test/integration/actions/agent.update.action.test.ts` | Per-action matrix: agent.update |
| C | `apps/api/test/integration/actions/ai_settings.update.action.test.ts` | Per-action matrix: ai_settings.update |
| C | `apps/api/test/integration/actions/ai_task.create.action.test.ts` | Per-action matrix: ai_task.create |
| C | `apps/api/test/integration/actions/ai_task.delete.action.test.ts` | Per-action matrix: ai_task.delete |
| C | `apps/api/test/integration/actions/ai_task.pause.action.test.ts` | Per-action matrix: ai_task.pause |
| C | `apps/api/test/integration/actions/ai_task.run_now.action.test.ts` | Per-action matrix: ai_task.run_now |
| C | `apps/api/test/integration/actions/ai_task.update.action.test.ts` | Per-action matrix: ai_task.update |
| C | `apps/api/test/integration/actions/ai.translate.action.test.ts` | Per-action matrix: ai.translate |
| C | `apps/api/test/integration/actions/appointment.cancel.action.test.ts` | Per-action matrix: appointment.cancel |
| C | `apps/api/test/integration/actions/appointment.check_in.action.test.ts` | Per-action matrix: appointment.check_in |
| C | `apps/api/test/integration/actions/appointment.complete.action.test.ts` | Per-action matrix: appointment.complete |
| C | `apps/api/test/integration/actions/appointment.confirm.action.test.ts` | Per-action matrix: appointment.confirm |
| C | `apps/api/test/integration/actions/appointment.create.action.test.ts` | Per-action matrix: appointment.create |
| C | `apps/api/test/integration/actions/appointment.find_slots.action.test.ts` | Per-action matrix: appointment.find_slots |
| C | `apps/api/test/integration/actions/appointment.get.action.test.ts` | Per-action matrix appointment.get |
| C | `apps/api/test/integration/actions/appointment.list.action.test.ts` | Per-action matrix: appointment.list |
| C | `apps/api/test/integration/actions/appointment.mark_no_show.action.test.ts` | Per-action matrix: appointment.mark_no_show |
| C | `apps/api/test/integration/actions/appointment.reschedule.action.test.ts` | Per-action matrix: appointment.reschedule |
| C | `apps/api/test/integration/actions/appointment.update.action.test.ts` | Per-action matrix appointment.update |
| C | `apps/api/test/integration/actions/approval.approve.action.test.ts` | Per-action matrix: approval.approve |
| C | `apps/api/test/integration/actions/approval.edit_and_approve.action.test.ts` | Per-action matrix: approval.edit_and_approve |
| C | `apps/api/test/integration/actions/approval.reject.action.test.ts` | Per-action matrix: approval.reject |
| C | `apps/api/test/integration/actions/bank_feed.connect.action.test.ts` | Per-action matrix: bank_feed.connect |
| C | `apps/api/test/integration/actions/bank_feed.disconnect.action.test.ts` | Per-action matrix: bank_feed.disconnect |
| C | `apps/api/test/integration/actions/billing.cancel_invoice.action.test.ts` | Per-action matrix: billing.cancel_invoice |
| C | `apps/api/test/integration/actions/billing.create_invoice.action.test.ts` | Per-action matrix: billing.create_invoice |
| C | `apps/api/test/integration/actions/billing.report_transfer.action.test.ts` | Per-action matrix: billing.report_transfer |
| C | `apps/api/test/integration/actions/business_hours.update.action.test.ts` | Per-action matrix: business_hours.update |
| C | `apps/api/test/integration/actions/business_profile.update.action.test.ts` | Per-action matrix: business_profile.update |
| C | `apps/api/test/integration/actions/canned_reply.create.action.test.ts` | Per-action matrix: canned_reply.create |
| C | `apps/api/test/integration/actions/canned_reply.delete.action.test.ts` | Per-action matrix: canned_reply.delete |
| C | `apps/api/test/integration/actions/canned_reply.update.action.test.ts` | Per-action matrix: canned_reply.update |
| C | `apps/api/test/integration/actions/category.create.action.test.ts` | Per-action matrix: category.create |
| C | `apps/api/test/integration/actions/channel.disconnect.action.test.ts` | Per-action matrix: channel.disconnect |
| C | `apps/api/test/integration/actions/channel.email.connect.action.test.ts` | Per-action matrix: channel.email.connect |
| C | `apps/api/test/integration/actions/channel.group_result.action.test.ts` | Per-action matrix channel.group_result |
| C | `apps/api/test/integration/actions/channel.pause.action.test.ts` | Per-action matrix: channel.pause |
| C | `apps/api/test/integration/actions/channel.reconnect.action.test.ts` | Per-action matrix: channel.reconnect |
| C | `apps/api/test/integration/actions/channel.resume.action.test.ts` | Per-action matrix: channel.resume |
| C | `apps/api/test/integration/actions/channel.search.action.test.ts` | Per-action matrix channel.search |
| C | `apps/api/test/integration/actions/channel.sync_history.action.test.ts` | Per-action matrix: channel.sync_history |
| C | `apps/api/test/integration/actions/channel.test.action.test.ts` | Per-action matrix: channel.test |
| C | `apps/api/test/integration/actions/channel.update_settings.action.test.ts` | Per-action matrix: channel.update_settings |
| C | `apps/api/test/integration/actions/channel.zalo.start_login.action.test.ts` | Per-action matrix: channel.zalo.start_login |
| C | `apps/api/test/integration/actions/contact.add_collaborator.action.test.ts` | Per-action matrix: contact.add_collaborator |
| C | `apps/api/test/integration/actions/contact.create.action.test.ts` | Per-action matrix: contact.create |
| C | `apps/api/test/integration/actions/contact.decide_access.action.test.ts` | Per-action matrix: contact.decide_access |
| C | `apps/api/test/integration/actions/contact.delete.action.test.ts` | Per-action matrix: contact.delete |
| C | `apps/api/test/integration/actions/contact.export.action.test.ts` | Per-action matrix: contact.export |
| C | `apps/api/test/integration/actions/contact.get_360.action.test.ts` | Per-action matrix contact.get_360 |
| C | `apps/api/test/integration/actions/contact.get.action.test.ts` | Per-action matrix contact.get |
| C | `apps/api/test/integration/actions/contact.import.action.test.ts` | Per-action matrix: contact.import |
| C | `apps/api/test/integration/actions/contact.merge.action.test.ts` | Per-action matrix: contact.merge |
| C | `apps/api/test/integration/actions/contact.remove_collaborator.action.test.ts` | Per-action matrix: contact.remove_collaborator |
| C | `apps/api/test/integration/actions/contact.request_access.action.test.ts` | Per-action matrix: contact.request_access |
| C | `apps/api/test/integration/actions/contact.search.action.test.ts` | Per-action matrix: contact.search |
| C | `apps/api/test/integration/actions/contact.send_email.action.test.ts` | Per-action matrix: contact.send_email |
| C | `apps/api/test/integration/actions/contact.set_stage.action.test.ts` | Per-action matrix: contact.set_stage |
| C | `apps/api/test/integration/actions/contact.tag.action.test.ts` | Per-action matrix: contact.tag |
| C | `apps/api/test/integration/actions/contact.transfer_owner.action.test.ts` | Per-action matrix: contact.transfer_owner |
| C | `apps/api/test/integration/actions/contact.update.action.test.ts` | Per-action matrix: contact.update |
| C | `apps/api/test/integration/actions/contract.approve_and_sign.action.test.ts` | Per-action matrix: contract.approve_and_sign |
| C | `apps/api/test/integration/actions/contract.create_from_quote.action.test.ts` | Per-action matrix: contract.create_from_quote |
| C | `apps/api/test/integration/actions/contract.create.action.test.ts` | Per-action matrix: contract.create |
| C | `apps/api/test/integration/actions/contract.delete.action.test.ts` | Per-action matrix: contract.delete |
| C | `apps/api/test/integration/actions/contract.extend_sign_link.action.test.ts` | Per-action matrix: contract.extend_sign_link |
| C | `apps/api/test/integration/actions/contract.get.action.test.ts` | Per-action matrix contract.get |
| C | `apps/api/test/integration/actions/contract.reject_internal.action.test.ts` | Per-action matrix: contract.reject_internal |
| C | `apps/api/test/integration/actions/contract.remind_signer.action.test.ts` | Per-action matrix: contract.remind_signer |
| C | `apps/api/test/integration/actions/contract.renew.action.test.ts` | Per-action matrix: contract.renew |
| C | `apps/api/test/integration/actions/contract.request_changes.action.test.ts` | Per-action matrix: contract.request_changes |
| C | `apps/api/test/integration/actions/contract.search.action.test.ts` | Per-action matrix contract.search |
| C | `apps/api/test/integration/actions/contract.send_for_signature.action.test.ts` | Per-action matrix: contract.send_for_signature |
| C | `apps/api/test/integration/actions/contract.submit.action.test.ts` | Per-action matrix: contract.submit |
| C | `apps/api/test/integration/actions/contract.terminate.action.test.ts` | Per-action matrix: contract.terminate |
| C | `apps/api/test/integration/actions/contract.update.action.test.ts` | Per-action matrix: contract.update |
| C | `apps/api/test/integration/actions/conversation.archive.action.test.ts` | Per-action matrix: conversation.archive |
| C | `apps/api/test/integration/actions/conversation.assign.action.test.ts` | Per-action matrix: conversation.assign |
| C | `apps/api/test/integration/actions/conversation.bulk_update.action.test.ts` | Per-action matrix: conversation.bulk_update |
| C | `apps/api/test/integration/actions/conversation.clear_history.action.test.ts` | Per-action matrix: conversation.clear_history |
| C | `apps/api/test/integration/actions/conversation.create_group.action.test.ts` | Per-action matrix conversation.create_group |
| C | `apps/api/test/integration/actions/conversation.get.action.test.ts` | Per-action matrix conversation.get |
| C | `apps/api/test/integration/actions/conversation.handoff.action.test.ts` | Per-action matrix: conversation.handoff |
| C | `apps/api/test/integration/actions/conversation.hide.action.test.ts` | Per-action matrix: conversation.hide |
| C | `apps/api/test/integration/actions/conversation.mark_read.action.test.ts` | Per-action matrix: conversation.mark_read |
| C | `apps/api/test/integration/actions/conversation.pin.action.test.ts` | Per-action matrix: conversation.pin |
| C | `apps/api/test/integration/actions/conversation.search.action.test.ts` | Per-action matrix conversation.search |
| C | `apps/api/test/integration/actions/conversation.set_ai_mode.action.test.ts` | Per-action matrix: conversation.set_ai_mode |
| C | `apps/api/test/integration/actions/conversation.set_status.action.test.ts` | Per-action matrix: conversation.set_status |
| C | `apps/api/test/integration/actions/conversation.set_tags.action.test.ts` | Per-action matrix: conversation.set_tags |
| C | `apps/api/test/integration/actions/conversation.tag.action.test.ts` | Per-action matrix: conversation.tag |
| C | `apps/api/test/integration/actions/custom_field.define.action.test.ts` | Per-action matrix: custom_field.define |
| C | `apps/api/test/integration/actions/custom_field.delete.action.test.ts` | Per-action matrix: custom_field.delete |
| C | `apps/api/test/integration/actions/custom_field.update.action.test.ts` | Per-action matrix: custom_field.update |
| C | `apps/api/test/integration/actions/doc_template.create.action.test.ts` | Per-action matrix: doc_template.create |
| C | `apps/api/test/integration/actions/doc_template.delete.action.test.ts` | Per-action matrix: doc_template.delete |
| C | `apps/api/test/integration/actions/doc_template.detect_fields.action.test.ts` | Per-action matrix: doc_template.detect_fields |
| C | `apps/api/test/integration/actions/doc_template.search.action.test.ts` | Per-action matrix doc_template.search |
| C | `apps/api/test/integration/actions/doc_template.update.action.test.ts` | Per-action matrix: doc_template.update |
| C | `apps/api/test/integration/actions/governance.update.action.test.ts` | Per-action matrix: governance.update |
| C | `apps/api/test/integration/actions/integration.connect.action.test.ts` | Per-action matrix: integration.connect |
| C | `apps/api/test/integration/actions/integration.disconnect.action.test.ts` | Per-action matrix: integration.disconnect |
| C | `apps/api/test/integration/actions/integration.register_interest.action.test.ts` | Per-action matrix: integration.register_interest |
| C | `apps/api/test/integration/actions/invite.revoke.action.test.ts` | Per-action matrix: invite.revoke |
| C | `apps/api/test/integration/actions/invoice.create.action.test.ts` | Per-action matrix: invoice.create |
| C | `apps/api/test/integration/actions/invoice.get.action.test.ts` | Per-action matrix invoice.get |
| C | `apps/api/test/integration/actions/invoice.record_payment.action.test.ts` | Per-action matrix: invoice.record_payment |
| C | `apps/api/test/integration/actions/invoice.resolve_bank_match.action.test.ts` | Per-action matrix: invoice.resolve_bank_match |
| C | `apps/api/test/integration/actions/invoice.search.action.test.ts` | Per-action matrix invoice.search |
| C | `apps/api/test/integration/actions/invoice.send_payment_qr.action.test.ts` | Per-action matrix: invoice.send_payment_qr |
| C | `apps/api/test/integration/actions/invoice.void.action.test.ts` | Per-action matrix: invoice.void |
| C | `apps/api/test/integration/actions/kb.add_source.action.test.ts` | Per-action matrix: kb.add_source |
| C | `apps/api/test/integration/actions/kb.folder.create.action.test.ts` | Per-action matrix: kb.folder.create |
| C | `apps/api/test/integration/actions/kb.refresh_source.action.test.ts` | Per-action matrix: kb.refresh_source |
| C | `apps/api/test/integration/actions/kb.remove_source.action.test.ts` | Per-action matrix: kb.remove_source |
| C | `apps/api/test/integration/actions/kb.search.action.test.ts` | Per-action matrix: kb.search |
| C | `apps/api/test/integration/actions/kb.source_search.action.test.ts` | Per-action matrix kb.source_search |
| C | `apps/api/test/integration/actions/kb.update_source.action.test.ts` | Per-action matrix: kb.update_source |
| C | `apps/api/test/integration/actions/member.invite.action.test.ts` | Per-action matrix: member.invite |
| C | `apps/api/test/integration/actions/member.remove.action.test.ts` | Per-action matrix: member.remove |
| C | `apps/api/test/integration/actions/member.search.action.test.ts` | Per-action matrix member.search |
| C | `apps/api/test/integration/actions/member.set_role.action.test.ts` | Per-action matrix: member.set_role |
| C | `apps/api/test/integration/actions/message.delete.action.test.ts` | Per-action matrix: message.delete |
| C | `apps/api/test/integration/actions/message.forward.action.test.ts` | Per-action matrix: message.forward |
| C | `apps/api/test/integration/actions/message.pin.action.test.ts` | Per-action matrix: message.pin |
| C | `apps/api/test/integration/actions/message.react.action.test.ts` | Per-action matrix: message.react |
| C | `apps/api/test/integration/actions/message.recall.action.test.ts` | Per-action matrix: message.recall |
| C | `apps/api/test/integration/actions/message.send.action.test.ts` | Per-action matrix: message.send |
| C | `apps/api/test/integration/actions/note.add.action.test.ts` | Per-action matrix: note.add |
| C | `apps/api/test/integration/actions/notification.mark_read.action.test.ts` | Per-action matrix: notification.mark_read |
| C | `apps/api/test/integration/actions/notification.update_prefs.action.test.ts` | Per-action matrix: notification.update_prefs |
| C | `apps/api/test/integration/actions/onboarding.toggle_step.action.test.ts` | Per-action matrix: onboarding.toggle_step |
| C | `apps/api/test/integration/actions/order.cancel.action.test.ts` | Per-action matrix: order.cancel |
| C | `apps/api/test/integration/actions/order.complete.action.test.ts` | Per-action matrix: order.complete |
| C | `apps/api/test/integration/actions/order.confirm.action.test.ts` | Per-action matrix: order.confirm |
| C | `apps/api/test/integration/actions/order.create_from_appointment.action.test.ts` | Per-action matrix: order.create_from_appointment |
| C | `apps/api/test/integration/actions/order.create_from_contract.action.test.ts` | Per-action matrix: order.create_from_contract |
| C | `apps/api/test/integration/actions/order.create_from_quote.action.test.ts` | Per-action matrix: order.create_from_quote |
| C | `apps/api/test/integration/actions/order.create.action.test.ts` | Per-action matrix: order.create |
| C | `apps/api/test/integration/actions/order.get.action.test.ts` | Per-action matrix order.get |
| C | `apps/api/test/integration/actions/order.search.action.test.ts` | Per-action matrix order.search |
| C | `apps/api/test/integration/actions/order.set_deposit.action.test.ts` | Per-action matrix: order.set_deposit |
| C | `apps/api/test/integration/actions/order.sync_now.action.test.ts` | Per-action matrix: order.sync_now |
| C | `apps/api/test/integration/actions/order.update_shipping.action.test.ts` | Per-action matrix: order.update_shipping |
| C | `apps/api/test/integration/actions/order.update.action.test.ts` | Per-action matrix: order.update |
| C | `apps/api/test/integration/actions/package.adjust_sessions.action.test.ts` | Per-action matrix: package.adjust_sessions |
| C | `apps/api/test/integration/actions/package.extend.action.test.ts` | Per-action matrix: package.extend |
| C | `apps/api/test/integration/actions/payment_account.update.action.test.ts` | Per-action matrix: payment_account.update |
| C | `apps/api/test/integration/actions/payment.refund_approve.action.test.ts` | Per-action matrix: payment.refund_approve |
| C | `apps/api/test/integration/actions/payment.refund_reject.action.test.ts` | Per-action matrix: payment.refund_reject |
| C | `apps/api/test/integration/actions/payment.refund.action.test.ts` | Per-action matrix: payment.refund |
| C | `apps/api/test/integration/actions/product.archive.action.test.ts` | Per-action matrix: product.archive |
| C | `apps/api/test/integration/actions/product.create.action.test.ts` | Per-action matrix: product.create |
| C | `apps/api/test/integration/actions/product.get.action.test.ts` | Per-action matrix: product.get |
| C | `apps/api/test/integration/actions/product.search.action.test.ts` | Per-action matrix: product.search |
| C | `apps/api/test/integration/actions/product.update.action.test.ts` | Per-action matrix: product.update |
| C | `apps/api/test/integration/actions/profile_layout.assign_role.action.test.ts` | Per-action matrix: profile_layout.assign_role |
| C | `apps/api/test/integration/actions/profile_layout.create.action.test.ts` | Per-action matrix: profile_layout.create |
| C | `apps/api/test/integration/actions/profile_layout.delete.action.test.ts` | Per-action matrix: profile_layout.delete |
| C | `apps/api/test/integration/actions/profile_layout.duplicate.action.test.ts` | Per-action matrix: profile_layout.duplicate |
| C | `apps/api/test/integration/actions/profile_layout.update.action.test.ts` | Per-action matrix: profile_layout.update |
| C | `apps/api/test/integration/actions/profile.update.action.test.ts` | Per-action matrix: profile.update |
| C | `apps/api/test/integration/actions/quote.approve.action.test.ts` | Per-action matrix: quote.approve |
| C | `apps/api/test/integration/actions/quote.comment.action.test.ts` | Per-action matrix: quote.comment |
| C | `apps/api/test/integration/actions/quote.create.action.test.ts` | Per-action matrix: quote.create |
| C | `apps/api/test/integration/actions/quote.delete.action.test.ts` | Per-action matrix: quote.delete |
| C | `apps/api/test/integration/actions/quote.draft_from_content.action.test.ts` | Per-action matrix: quote.draft_from_content |
| C | `apps/api/test/integration/actions/quote.extend_validity.action.test.ts` | Per-action matrix: quote.extend_validity |
| C | `apps/api/test/integration/actions/quote.get.action.test.ts` | Per-action matrix quote.get |
| C | `apps/api/test/integration/actions/quote.mark_accepted.action.test.ts` | Per-action matrix: quote.mark_accepted |
| C | `apps/api/test/integration/actions/quote.mark_rejected.action.test.ts` | Per-action matrix: quote.mark_rejected |
| C | `apps/api/test/integration/actions/quote.reject_internal.action.test.ts` | Per-action matrix: quote.reject_internal |
| C | `apps/api/test/integration/actions/quote.request_revision.action.test.ts` | Per-action matrix: quote.request_revision |
| C | `apps/api/test/integration/actions/quote.search.action.test.ts` | Per-action matrix quote.search |
| C | `apps/api/test/integration/actions/quote.send.action.test.ts` | Per-action matrix: quote.send |
| C | `apps/api/test/integration/actions/quote.submit_for_approval.action.test.ts` | Per-action matrix: quote.submit_for_approval |
| C | `apps/api/test/integration/actions/quote.update.action.test.ts` | Per-action matrix: quote.update |
| C | `apps/api/test/integration/actions/run.cancel.action.test.ts` | Per-action matrix: run.cancel |
| C | `apps/api/test/integration/actions/run.search.action.test.ts` | Per-action matrix run.search |
| C | `apps/api/test/integration/actions/service.search.action.test.ts` | Per-action matrix service.search |
| C | `apps/api/test/integration/actions/sla.update_default.action.test.ts` | Per-action matrix: sla.update_default |
| C | `apps/api/test/integration/actions/staff.create.action.test.ts` | Per-action matrix: staff.create |
| C | `apps/api/test/integration/actions/staff.deactivate.action.test.ts` | Per-action matrix: staff.deactivate |
| C | `apps/api/test/integration/actions/staff.search.action.test.ts` | Per-action matrix staff.search |
| C | `apps/api/test/integration/actions/staff.update.action.test.ts` | Per-action matrix: staff.update |
| C | `apps/api/test/integration/actions/stock.adjust.action.test.ts` | Per-action matrix: stock.adjust |
| C | `apps/api/test/integration/actions/stock.get.action.test.ts` | Per-action matrix: stock.get |
| C | `apps/api/test/integration/actions/tag.create.action.test.ts` | Per-action matrix: tag.create |
| C | `apps/api/test/integration/actions/tag.delete.action.test.ts` | Per-action matrix: tag.delete |
| C | `apps/api/test/integration/actions/tag.search.action.test.ts` | Per-action matrix tag.search |
| C | `apps/api/test/integration/actions/tag.update.action.test.ts` | Per-action matrix: tag.update |
| C | `apps/api/test/integration/actions/ticket.assign.action.test.ts` | Per-action matrix: ticket.assign |
| C | `apps/api/test/integration/actions/ticket.bulk_update.action.test.ts` | Per-action matrix: ticket.bulk_update |
| C | `apps/api/test/integration/actions/ticket.close.action.test.ts` | Per-action matrix: ticket.close |
| C | `apps/api/test/integration/actions/ticket.comment.action.test.ts` | Per-action matrix: ticket.comment |
| C | `apps/api/test/integration/actions/ticket.create.action.test.ts` | Per-action matrix: ticket.create |
| C | `apps/api/test/integration/actions/ticket.get.action.test.ts` | Per-action matrix ticket.get |
| C | `apps/api/test/integration/actions/ticket.reopen.action.test.ts` | Per-action matrix: ticket.reopen |
| C | `apps/api/test/integration/actions/ticket.search.action.test.ts` | Per-action matrix: ticket.search |
| C | `apps/api/test/integration/actions/ticket.set_status.action.test.ts` | Per-action matrix: ticket.set_status |
| C | `apps/api/test/integration/actions/ticket.update.action.test.ts` | Per-action matrix: ticket.update |
| C | `apps/api/test/integration/actions/webchat.update_widget.action.test.ts` | Per-action matrix: webchat.update_widget |
| C | `apps/api/test/integration/actions/working_hours.update.action.test.ts` | Per-action matrix: working_hours.update |
| C | `apps/api/test/integration/actions/workspace.switch.action.test.ts` | Per-action matrix: workspace.switch |
| C | `apps/api/test/integration/actions/workspace.update.action.test.ts` | Per-action matrix: workspace.update |
| C | `apps/api/test/integration/appointment-update.test.ts` | Extracted implementation or targeted evidence |
| C | `apps/api/test/integration/assistant-vertical.test.ts` | Extracted implementation or targeted evidence |
| C | `apps/api/test/integration/conversation-groups.test.ts` | Extracted implementation or targeted evidence |
| C | `apps/api/test/integration/fixtures/action-matrix.ts` | Extracted implementation or targeted evidence |
| C | `apps/api/test/integration/helpers/action-matrix.ts` | Extracted implementation or targeted evidence |
| C | `apps/web/e2e/assistant-vertical.spec.ts` | Extracted implementation or targeted evidence |
| C | `apps/web/e2e/http/assistant-vertical.spec.ts` | Extracted implementation or targeted evidence |
| M | `apps/web/messages/en/actions.json` | UI labels |
| M | `apps/web/messages/en/assistant.json` | UI labels |
| M | `apps/web/messages/en/calendar.json` | UI labels |
| M | `apps/web/messages/en/inbox.json` | UI labels |
| M | `apps/web/messages/vi/actions.json` | UI labels |
| M | `apps/web/messages/vi/assistant.json` | UI labels |
| M | `apps/web/messages/vi/calendar.json` | UI labels |
| M | `apps/web/messages/vi/inbox.json` | UI labels |
| M | `apps/web/src/features/assistant/api.ts` | Runtime/contract/wiring |
| C | `apps/web/src/features/assistant/components/ActionPreviewCard.tsx` | Extracted implementation or targeted evidence |
| M | `apps/web/src/features/assistant/components/ChatThread.tsx` | Runtime/contract/wiring |
| C | `apps/web/src/features/assistant/components/EditActionPreviewModal.tsx` | Extracted implementation or targeted evidence |
| M | `apps/web/src/features/assistant/hooks/useAssistantChat.ts` | Runtime/contract/wiring |
| C | `apps/web/src/features/assistant/hooks/useEditActionPreview.ts` | Extracted implementation or targeted evidence |
| M | `apps/web/src/features/assistant/types.ts` | Runtime/contract/wiring |
| M | `apps/web/src/features/inbox/components/ConvMenu.tsx` | Runtime/contract/wiring |
| C | `apps/web/src/features/inbox/components/CreateGroupModal.tsx` | Extracted implementation or targeted evidence |
| C | `apps/web/src/features/inbox/hooks/useCreateGroup.ts` | Extracted implementation or targeted evidence |
| C | `apps/web/src/shared/actions/useAction-approval.test.tsx` | Extracted implementation or targeted evidence |
| M | `apps/web/src/shared/actions/useAction.ts` | Runtime/contract/wiring |
| M | `apps/web/src/shared/api/mock/domains/assistant.ts` | Current authority, scoped shared query, preview or transport wiring |
| C | `apps/worker/test/ai-role-handlers.test.ts` | Extracted implementation or targeted evidence |
| C | `apps/worker/test/integration/ai-commerce-resume.test.ts` | Extracted implementation or targeted evidence |
| C | `apps/worker/test/integration/fixtures/ai-process.ts` | Explicit integration seam |
| M | `apps/worker/vitest.config.ts` | Runtime/contract/wiring |
| C | `apps/worker/vitest.integration.config.ts` | Extracted implementation or targeted evidence |
| C | `fixtures/ai-eval/assistant-vertical.json` | Extracted implementation or targeted evidence |
| C | `fixtures/ai-eval/live-seed.mjs` | Extracted implementation or targeted evidence |
| M | `package.json` | Runtime/contract/wiring |
| C | `packages/actions/src/booking-update.ts` | Extracted implementation or targeted evidence |
| C | `packages/actions/src/conversation-groups.ts` | Extracted implementation or targeted evidence |
| M | `packages/actions/src/define.ts` | Runtime/contract/wiring |
| C | `packages/actions/src/group-results.ts` | Explicit integration seam |
| M | `packages/actions/src/index.ts` | Runtime/contract/wiring |
| C | `packages/actions/src/reads/ai.ts` | Domain read action definitions |
| C | `packages/actions/src/reads/booking.ts` | Domain read action definitions |
| C | `packages/actions/src/reads/channels.ts` | Domain read action definitions |
| C | `packages/actions/src/reads/contracts.ts` | Domain read action definitions |
| C | `packages/actions/src/reads/crm.ts` | Domain read action definitions |
| C | `packages/actions/src/reads/documents.ts` | Domain read action definitions |
| C | `packages/actions/src/reads/identity.ts` | Domain read action definitions |
| C | `packages/actions/src/reads/inbox.ts` | Domain read action definitions |
| C | `packages/actions/src/reads/sales.ts` | Domain read action definitions |
| C | `packages/actions/src/reads/support.ts` | Domain read action definitions |
| M | `packages/ai/src/gateway/types.ts` | Runtime/contract/wiring |
| M | `packages/ai/src/prompts/assistant.en.md` | Runtime/contract/wiring |
| M | `packages/ai/src/prompts/assistant.vi.md` | Runtime/contract/wiring |
| M | `packages/channels/src/types.ts` | Runtime/contract/wiring |
| M | `packages/channels/src/zalo-personal/adapter.ts` | Runtime/contract/wiring |
| M | `packages/channels/src/zalo-personal/fake-transport.ts` | Runtime/contract/wiring |
| M | `packages/channels/src/zalo-personal/manifest.ts` | Runtime/contract/wiring |
| M | `packages/channels/src/zalo-personal/transport.ts` | Runtime/contract/wiring |
| M | `packages/channels/src/zalo-personal/zca-transport.ts` | Runtime/contract/wiring |
| C | `packages/channels/test/zalo-group.test.ts` | Extracted implementation or targeted evidence |
| M | `packages/core/src/ai/agents/agent-llm.handlers.ts` | Domain preview for agent.test, agent.draft_from_description, agent.optimize_prompt |
| C | `packages/core/src/ai/agents/agent-read.handlers.ts` | Extracted implementation or targeted evidence |
| M | `packages/core/src/ai/agents/agent-tools.ts` | Runtime/contract/wiring |
| M | `packages/core/src/ai/agents/agent.handlers.ts` | Domain preview for agent.create, agent.create_and_publish, agent.update, agent.publish, agent.rollback, agent.pause, agent.delete |
| M | `packages/core/src/ai/agents/agent.runtime.ts` | Runtime/contract/wiring |
| M | `packages/core/src/ai/agents/agents.read.ts` | Current authority, scoped shared query, preview or transport wiring |
| C | `packages/core/src/ai/agents/current-authority.ts` | Extracted implementation or targeted evidence |
| C | `packages/core/src/ai/agents/previews/agent-llm.handlers.preview.ts` | Scoped preview helper for packages/core/src/ai/agents/agent-llm.handlers.ts |
| C | `packages/core/src/ai/agents/previews/agent.handlers.preview.ts` | Scoped preview helper for packages/core/src/ai/agents/agent.handlers.ts |
| M | `packages/core/src/ai/ai.module.ts` | Runtime/contract/wiring |
| M | `packages/core/src/ai/approvals/approval.handlers.ts` | Domain preview for approval.approve, approval.reject, approval.edit_and_approve |
| C | `packages/core/src/ai/approvals/previews/approval.handlers.preview.ts` | Scoped preview helper for packages/core/src/ai/approvals/approval.handlers.ts |
| M | `packages/core/src/ai/approvals/resume.ts` | Runtime/contract/wiring |
| C | `packages/core/src/ai/assistant/action-readback.ts` | Extracted implementation or targeted evidence |
| M | `packages/core/src/ai/assistant/assistant.service.ts` | Runtime/contract/wiring |
| M | `packages/core/src/ai/assistant/card.ts` | Runtime/contract/wiring |
| M | `packages/core/src/ai/assistant/catalog.ts` | Runtime/contract/wiring |
| M | `packages/core/src/ai/assistant/code-refs.ts` | Runtime/contract/wiring |
| C | `packages/core/src/ai/assistant/custom-schema.ts` | Extracted implementation or targeted evidence |
| M | `packages/core/src/ai/assistant/delegate.ts` | Runtime/contract/wiring |
| C | `packages/core/src/ai/assistant/edit-preview.ts` | Explicit integration seam |
| M | `packages/core/src/ai/assistant/meta-tools.ts` | Runtime/contract/wiring |
| C | `packages/core/src/ai/assistant/pending-action.ts` | Extracted implementation or targeted evidence |
| C | `packages/core/src/ai/assistant/read-dispatch.ts` | Explicit integration seam |
| C | `packages/core/src/ai/assistant/reference-resolver.ts` | Extracted implementation or targeted evidence |
| C | `packages/core/src/ai/assistant/schema-brief.ts` | Extracted implementation or targeted evidence |
| M | `packages/core/src/ai/assistant/turn.service.ts` | Runtime/contract/wiring |
| M | `packages/core/src/ai/assistant/types.ts` | Runtime/contract/wiring |
| M | `packages/core/src/ai/governance/governance.ts` | Domain preview for governance.update |
| C | `packages/core/src/ai/governance/previews/governance.preview.ts` | Scoped preview helper for packages/core/src/ai/governance/governance.ts |
| C | `packages/core/src/ai/jobs/ai-domain-handlers.module.ts` | Extracted implementation or targeted evidence |
| M | `packages/core/src/ai/jobs/ai.jobs.module.ts` | Runtime/contract/wiring |
| M | `packages/core/src/ai/kb/kb-search.handler.ts` | Domain preview for kb.search |
| M | `packages/core/src/ai/kb/kb.handlers.ts` | Domain preview for kb.add_source, kb.update_source, kb.remove_source, kb.refresh_source, kb.folder.create |
| M | `packages/core/src/ai/kb/kb.read.ts` | Current authority, scoped shared query, preview or transport wiring |
| C | `packages/core/src/ai/kb/previews/kb-search.handler.preview.ts` | Scoped preview helper for packages/core/src/ai/kb/kb-search.handler.ts |
| C | `packages/core/src/ai/kb/previews/kb.handlers.preview.ts` | Scoped preview helper for packages/core/src/ai/kb/kb.handlers.ts |
| C | `packages/core/src/ai/kb/source-read.handler.ts` | Extracted implementation or targeted evidence |
| M | `packages/core/src/ai/reply/reply-tools.ts` | Runtime/contract/wiring |
| M | `packages/core/src/ai/reply/reply.service.ts` | Runtime/contract/wiring |
| C | `packages/core/src/ai/runs/previews/run-cancel.handler.preview.ts` | Scoped preview helper for packages/core/src/ai/runs/run-cancel.handler.ts |
| M | `packages/core/src/ai/runs/run-cancel.handler.ts` | Domain preview for run.cancel |
| C | `packages/core/src/ai/runs/run-read.handler.ts` | Extracted implementation or targeted evidence |
| M | `packages/core/src/ai/runs/run.store.ts` | Current authority, scoped shared query, preview or transport wiring |
| M | `packages/core/src/ai/runs/runner.ts` | Runtime/contract/wiring |
| M | `packages/core/src/ai/runs/runs.service.ts` | Current authority, scoped shared query, preview or transport wiring |
| M | `packages/core/src/ai/runs/tools.ts` | Runtime/contract/wiring |
| M | `packages/core/src/ai/settings/ai-settings.handlers.ts` | Domain preview for ai_settings.update |
| C | `packages/core/src/ai/settings/previews/ai-settings.handlers.preview.ts` | Scoped preview helper for packages/core/src/ai/settings/ai-settings.handlers.ts |
| C | `packages/core/src/ai/skills/previews/translate.handler.preview.ts` | Scoped preview helper for packages/core/src/ai/skills/translate.handler.ts |
| M | `packages/core/src/ai/skills/translate.handler.ts` | Domain preview for ai.translate |
| C | `packages/core/src/ai/tasks/previews/task.handlers.preview.ts` | Scoped preview helper for packages/core/src/ai/tasks/task.handlers.ts |
| M | `packages/core/src/ai/tasks/task.handlers.ts` | Domain preview for ai_task.create, ai_task.update, ai_task.pause, ai_task.delete, ai_task.run_now |
| M | `packages/core/src/ai/tasks/task.runner.ts` | Runtime/contract/wiring |
| M | `packages/core/src/billing/actions/admin-confirm-transfer.handler.ts` | Domain preview for admin.invoice.confirm_transfer |
| M | `packages/core/src/billing/actions/billing-cancel-invoice.handler.ts` | Domain preview for billing.cancel_invoice |
| M | `packages/core/src/billing/actions/billing-create-invoice.handler.ts` | Domain preview for billing.create_invoice |
| M | `packages/core/src/billing/actions/billing-report-transfer.handler.ts` | Domain preview for billing.report_transfer |
| C | `packages/core/src/billing/actions/previews/admin-confirm-transfer.handler.preview.ts` | Scoped preview helper for packages/core/src/billing/actions/admin-confirm-transfer.handler.ts |
| C | `packages/core/src/billing/actions/previews/billing-cancel-invoice.handler.preview.ts` | Scoped preview helper for packages/core/src/billing/actions/billing-cancel-invoice.handler.ts |
| C | `packages/core/src/billing/actions/previews/billing-create-invoice.handler.preview.ts` | Scoped preview helper for packages/core/src/billing/actions/billing-create-invoice.handler.ts |
| C | `packages/core/src/billing/actions/previews/billing-report-transfer.handler.preview.ts` | Scoped preview helper for packages/core/src/billing/actions/billing-report-transfer.handler.ts |
| M | `packages/core/src/booking/actions/appointment-book.handlers.ts` | Domain preview for appointment.find_slots, appointment.list, appointment.create, appointment.reschedule |
| M | `packages/core/src/booking/actions/appointment-flow.handlers.ts` | Domain preview for appointment.confirm, appointment.check_in, appointment.complete, appointment.mark_no_show, appointment.cancel |
| C | `packages/core/src/booking/actions/appointment-update.handler.ts` | Extracted implementation or targeted evidence |
| M | `packages/core/src/booking/actions/booking-config.handlers.ts` | Domain preview for staff.create, staff.update, staff.deactivate, business_hours.update |
| C | `packages/core/src/booking/actions/booking-read.handlers.ts` | Bounded reads sharing UI query services |
| C | `packages/core/src/booking/actions/booking-reference-read.handlers.ts` | Extracted implementation or targeted evidence |
| C | `packages/core/src/booking/actions/previews/appointment-book.handlers.preview.ts` | Scoped preview helper for packages/core/src/booking/actions/appointment-book.handlers.ts |
| C | `packages/core/src/booking/actions/previews/appointment-flow.handlers.preview.ts` | Scoped preview helper for packages/core/src/booking/actions/appointment-flow.handlers.ts |
| C | `packages/core/src/booking/actions/previews/booking-config.handlers.preview.ts` | Scoped preview helper for packages/core/src/booking/actions/booking-config.handlers.ts |
| M | `packages/core/src/booking/booking.module.ts` | Read handler registration |
| C | `packages/core/src/booking/services/appointment-edit.ts` | Extracted implementation or targeted evidence |
| M | `packages/core/src/booking/services/appointment-write.ts` | Runtime/contract/wiring |
| M | `packages/core/src/booking/services/calendar-read.service.ts` | Current authority, scoped shared query, preview or transport wiring |
| C | `packages/core/src/catalog/actions/previews/product.handlers.preview.ts` | Scoped preview helper for packages/core/src/catalog/actions/product.handlers.ts |
| C | `packages/core/src/catalog/actions/previews/read.handlers.preview.ts` | Scoped preview helper for packages/core/src/catalog/actions/read.handlers.ts |
| C | `packages/core/src/catalog/actions/previews/stock.handlers.preview.ts` | Scoped preview helper for packages/core/src/catalog/actions/stock.handlers.ts |
| M | `packages/core/src/catalog/actions/product.handlers.ts` | Domain preview for product.create, product.update, product.archive |
| M | `packages/core/src/catalog/actions/read.handlers.ts` | Domain preview for product.search, product.get, stock.get |
| M | `packages/core/src/catalog/actions/stock.handlers.ts` | Domain preview for category.create, stock.adjust |
| M | `packages/core/src/catalog/catalog.module.ts` | Read handler registration |
| M | `packages/core/src/catalog/services/catalog-read.service.ts` | Current authority, scoped shared query, preview or transport wiring |
| M | `packages/core/src/channels/actions/channel-connect.handlers.ts` | Domain preview for channel.zalo.start_login, channel.reconnect |
| M | `packages/core/src/channels/actions/channel-manage.handlers.ts` | Domain preview for channel.update_settings, channel.pause, channel.resume, channel.sync_history, channel.test, channel.disconnect |
| C | `packages/core/src/channels/actions/channel-read.handler.ts` | Extracted implementation or targeted evidence |
| C | `packages/core/src/channels/actions/group-result.handler.ts` | Explicit integration seam |
| C | `packages/core/src/channels/actions/previews/channel-connect.handlers.preview.ts` | Scoped preview helper for packages/core/src/channels/actions/channel-connect.handlers.ts |
| C | `packages/core/src/channels/actions/previews/channel-manage.handlers.preview.ts` | Scoped preview helper for packages/core/src/channels/actions/channel-manage.handlers.ts |
| M | `packages/core/src/channels/channels.module.ts` | Runtime/contract/wiring |
| M | `packages/core/src/channels/email/email.handlers.ts` | Domain preview for channel.email.connect |
| C | `packages/core/src/channels/email/previews/email.handlers.preview.ts` | Scoped preview helper for packages/core/src/channels/email/email.handlers.ts |
| C | `packages/core/src/channels/events/group-request.consumer.ts` | Extracted implementation or targeted evidence |
| M | `packages/core/src/channels/jobs/channels.jobs.module.ts` | Runtime/contract/wiring |
| C | `packages/core/src/channels/jobs/create-group.processor.ts` | Extracted implementation or targeted evidence |
| M | `packages/core/src/channels/jobs/send.processor.ts` | Runtime/contract/wiring |
| M | `packages/core/src/channels/jobs/sessions.ts` | Current authority, scoped shared query, preview or transport wiring |
| M | `packages/core/src/channels/public.ts` | Current authority, scoped shared query, preview or transport wiring |
| C | `packages/core/src/channels/services/group-read.ts` | Extracted implementation or targeted evidence |
| C | `packages/core/src/channels/services/group-requests.ts` | Extracted implementation or targeted evidence |
| C | `packages/core/src/channels/services/group-result.ts` | Extracted implementation or targeted evidence |
| M | `packages/core/src/channels/services/read.service.ts` | Current authority, scoped shared query, preview or transport wiring |
| C | `packages/core/src/channels/webchat/previews/webchat.handlers.preview.ts` | Scoped preview helper for packages/core/src/channels/webchat/webchat.handlers.ts |
| M | `packages/core/src/channels/webchat/webchat.handlers.ts` | Domain preview for webchat.update_widget |
| M | `packages/core/src/contracts/actions/contract-approval.handlers.ts` | Domain preview for contract.submit, contract.request_changes, contract.reject_internal, contract.approve_and_sign |
| C | `packages/core/src/contracts/actions/contract-read.handlers.ts` | Bounded reads sharing UI query services |
| M | `packages/core/src/contracts/actions/contract-send.handlers.ts` | Domain preview for contract.send_for_signature, contract.remind_signer, contract.extend_sign_link, contract.terminate |
| M | `packages/core/src/contracts/actions/contract-write.handlers.ts` | Domain preview for contract.create, contract.create_from_quote, contract.update, contract.delete, contract.renew |
| C | `packages/core/src/contracts/actions/previews/contract-approval.handlers.preview.ts` | Scoped preview helper for packages/core/src/contracts/actions/contract-approval.handlers.ts |
| C | `packages/core/src/contracts/actions/previews/contract-send.handlers.preview.ts` | Scoped preview helper for packages/core/src/contracts/actions/contract-send.handlers.ts |
| C | `packages/core/src/contracts/actions/previews/contract-write.handlers.preview.ts` | Scoped preview helper for packages/core/src/contracts/actions/contract-write.handlers.ts |
| M | `packages/core/src/contracts/contracts.module.ts` | Read handler registration |
| M | `packages/core/src/contracts/services/contracts-read.service.ts` | Current authority, scoped shared query, preview or transport wiring |
| M | `packages/core/src/crm/actions/contact-io.handlers.ts` | Domain preview for contact.export, contact.import |
| M | `packages/core/src/crm/actions/contact-merge.handler.ts` | Domain preview for contact.merge |
| M | `packages/core/src/crm/actions/contact-owner.handlers.ts` | Domain preview for contact.add_collaborator, contact.remove_collaborator, contact.transfer_owner, contact.request_access, contact.decide_access |
| C | `packages/core/src/crm/actions/contact-read.handlers.ts` | Bounded reads sharing UI query services |
| M | `packages/core/src/crm/actions/contact-search.handler.ts` | Domain preview for contact.search |
| M | `packages/core/src/crm/actions/contact-write.handlers.ts` | Domain preview for contact.create, contact.update, contact.set_stage, contact.tag, contact.delete |
| M | `packages/core/src/crm/actions/custom-field.handlers.ts` | Domain preview for custom_field.define, custom_field.update, custom_field.delete |
| C | `packages/core/src/crm/actions/previews/contact-io.handlers.preview.ts` | Scoped preview helper for packages/core/src/crm/actions/contact-io.handlers.ts |
| C | `packages/core/src/crm/actions/previews/contact-merge.handler.preview.ts` | Scoped preview helper for packages/core/src/crm/actions/contact-merge.handler.ts |
| C | `packages/core/src/crm/actions/previews/contact-owner.handlers.preview.ts` | Scoped preview helper for packages/core/src/crm/actions/contact-owner.handlers.ts |
| C | `packages/core/src/crm/actions/previews/contact-search.handler.preview.ts` | Scoped preview helper for packages/core/src/crm/actions/contact-search.handler.ts |
| C | `packages/core/src/crm/actions/previews/contact-write.handlers.preview.ts` | Scoped preview helper for packages/core/src/crm/actions/contact-write.handlers.ts |
| C | `packages/core/src/crm/actions/previews/custom-field.handlers.preview.ts` | Scoped preview helper for packages/core/src/crm/actions/custom-field.handlers.ts |
| C | `packages/core/src/crm/actions/previews/profile-layout.handlers.preview.ts` | Scoped preview helper for packages/core/src/crm/actions/profile-layout.handlers.ts |
| M | `packages/core/src/crm/actions/profile-layout.handlers.ts` | Domain preview for profile_layout.create, profile_layout.update, profile_layout.duplicate, profile_layout.delete, profile_layout.assign_role |
| M | `packages/core/src/crm/crm.module.ts` | Read handler registration |
| M | `packages/core/src/crm/services/crm-read.service.ts` | Current authority, scoped shared query, preview or transport wiring |
| M | `packages/core/src/crm/services/fields.service.ts` | Current authority, scoped shared query, preview or transport wiring |
| M | `packages/core/src/documents/actions/doc-template.handlers.ts` | Domain preview for doc_template.create, doc_template.update, doc_template.delete, doc_template.detect_fields |
| C | `packages/core/src/documents/actions/previews/doc-template.handlers.preview.ts` | Scoped preview helper for packages/core/src/documents/actions/doc-template.handlers.ts |
| C | `packages/core/src/documents/actions/template-read.handler.ts` | Extracted implementation or targeted evidence |
| M | `packages/core/src/documents/documents.module.ts` | Runtime/contract/wiring |
| M | `packages/core/src/documents/services/documents-read.service.ts` | Current authority, scoped shared query, preview or transport wiring |
| M | `packages/core/src/identity/actions/business-profile-update.handler.ts` | Domain preview for business_profile.update |
| M | `packages/core/src/identity/actions/invite-revoke.handler.ts` | Domain preview for invite.revoke |
| M | `packages/core/src/identity/actions/member-invite.handler.ts` | Domain preview for member.invite |
| C | `packages/core/src/identity/actions/member-read.handler.ts` | Extracted implementation or targeted evidence |
| M | `packages/core/src/identity/actions/member-remove.handler.ts` | Domain preview for member.remove |
| M | `packages/core/src/identity/actions/member-set-role.handler.ts` | Domain preview for member.set_role |
| M | `packages/core/src/identity/actions/onboarding-toggle-step.handler.ts` | Domain preview for onboarding.toggle_step |
| C | `packages/core/src/identity/actions/previews/business-profile-update.handler.preview.ts` | Scoped preview helper for packages/core/src/identity/actions/business-profile-update.handler.ts |
| C | `packages/core/src/identity/actions/previews/invite-revoke.handler.preview.ts` | Scoped preview helper for packages/core/src/identity/actions/invite-revoke.handler.ts |
| C | `packages/core/src/identity/actions/previews/member-invite.handler.preview.ts` | Scoped preview helper for packages/core/src/identity/actions/member-invite.handler.ts |
| C | `packages/core/src/identity/actions/previews/member-remove.handler.preview.ts` | Scoped preview helper for packages/core/src/identity/actions/member-remove.handler.ts |
| C | `packages/core/src/identity/actions/previews/member-set-role.handler.preview.ts` | Scoped preview helper for packages/core/src/identity/actions/member-set-role.handler.ts |
| C | `packages/core/src/identity/actions/previews/onboarding-toggle-step.handler.preview.ts` | Scoped preview helper for packages/core/src/identity/actions/onboarding-toggle-step.handler.ts |
| C | `packages/core/src/identity/actions/previews/profile-update.handler.preview.ts` | Scoped preview helper for packages/core/src/identity/actions/profile-update.handler.ts |
| C | `packages/core/src/identity/actions/previews/working-hours-update.handler.preview.ts` | Scoped preview helper for packages/core/src/identity/actions/working-hours-update.handler.ts |
| C | `packages/core/src/identity/actions/previews/workspace-switch.handler.preview.ts` | Scoped preview helper for packages/core/src/identity/actions/workspace-switch.handler.ts |
| C | `packages/core/src/identity/actions/previews/workspace-update.handler.preview.ts` | Scoped preview helper for packages/core/src/identity/actions/workspace-update.handler.ts |
| M | `packages/core/src/identity/actions/profile-update.handler.ts` | Domain preview for profile.update |
| M | `packages/core/src/identity/actions/working-hours-update.handler.ts` | Domain preview for working_hours.update |
| M | `packages/core/src/identity/actions/workspace-switch.handler.ts` | Domain preview for workspace.switch |
| M | `packages/core/src/identity/actions/workspace-update.handler.ts` | Domain preview for workspace.update |
| M | `packages/core/src/identity/identity.module.ts` | Runtime/contract/wiring |
| M | `packages/core/src/identity/settings/settings-read.service.ts` | Current authority, scoped shared query, preview or transport wiring |
| M | `packages/core/src/inbox/actions/conversation-assign.handlers.ts` | Domain preview for conversation.assign, conversation.tag, conversation.set_tags, conversation.bulk_update |
| C | `packages/core/src/inbox/actions/conversation-create-group.handler.ts` | Extracted implementation or targeted evidence |
| C | `packages/core/src/inbox/actions/conversation-read.handlers.ts` | Bounded reads sharing UI query services |
| M | `packages/core/src/inbox/actions/conversation-state.handlers.ts` | Domain preview for conversation.mark_read, conversation.set_status, conversation.pin, conversation.archive, conversation.hide, conversation.set_ai_mode, conversation.handoff, conversation.clear_history |
| M | `packages/core/src/inbox/actions/email-send.handlers.ts` | Domain preview for contact.send_email |
| M | `packages/core/src/inbox/actions/message.handlers.ts` | Domain preview for message.send, message.forward, message.recall, message.delete, message.react, message.pin, note.add |
| C | `packages/core/src/inbox/actions/previews/conversation-assign.handlers.preview.ts` | Scoped preview helper for packages/core/src/inbox/actions/conversation-assign.handlers.ts |
| C | `packages/core/src/inbox/actions/previews/conversation-state.handlers.preview.ts` | Scoped preview helper for packages/core/src/inbox/actions/conversation-state.handlers.ts |
| C | `packages/core/src/inbox/actions/previews/email-send.handlers.preview.ts` | Scoped preview helper for packages/core/src/inbox/actions/email-send.handlers.ts |
| C | `packages/core/src/inbox/actions/previews/message.handlers.preview.ts` | Scoped preview helper for packages/core/src/inbox/actions/message.handlers.ts |
| C | `packages/core/src/inbox/actions/previews/settings.handlers.preview.ts` | Scoped preview helper for packages/core/src/inbox/actions/settings.handlers.ts |
| M | `packages/core/src/inbox/actions/settings.handlers.ts` | Domain preview for tag.create, tag.update, tag.delete, canned_reply.create, canned_reply.update, canned_reply.delete |
| C | `packages/core/src/inbox/actions/tag-read.handler.ts` | Extracted implementation or targeted evidence |
| M | `packages/core/src/inbox/inbox.module.ts` | Read handler registration |
| M | `packages/core/src/inbox/services/meta.service.ts` | Current authority, scoped shared query, preview or transport wiring |
| M | `packages/core/src/inbox/services/read.service.ts` | Current authority, scoped shared query, preview or transport wiring |
| M | `packages/core/src/integrations/actions/integration-connect.handler.ts` | Domain preview for integration.connect |
| M | `packages/core/src/integrations/actions/integration-disconnect.handler.ts` | Domain preview for integration.disconnect |
| M | `packages/core/src/integrations/actions/integration-register-interest.handler.ts` | Domain preview for integration.register_interest |
| C | `packages/core/src/integrations/actions/previews/integration-connect.handler.preview.ts` | Scoped preview helper for packages/core/src/integrations/actions/integration-connect.handler.ts |
| C | `packages/core/src/integrations/actions/previews/integration-disconnect.handler.preview.ts` | Scoped preview helper for packages/core/src/integrations/actions/integration-disconnect.handler.ts |
| C | `packages/core/src/integrations/actions/previews/integration-register-interest.handler.preview.ts` | Scoped preview helper for packages/core/src/integrations/actions/integration-register-interest.handler.ts |
| M | `packages/core/src/kernel/actions/confirm-token.ts` | Runtime/contract/wiring |
| M | `packages/core/src/kernel/actions/executor.ts` | Current authority, scoped shared query, preview or transport wiring |
| M | `packages/core/src/kernel/actions/handler-registry.ts` | Runtime/contract/wiring |
| M | `packages/core/src/kernel/actions/handler.ts` | Current authority, scoped shared query, preview or transport wiring |
| M | `packages/core/src/kernel/actions/policy.ts` | Current authority, scoped shared query, preview or transport wiring |
| M | `packages/core/src/kernel/kernel.module.ts` | Current authority, scoped shared query, preview or transport wiring |
| M | `packages/core/src/notify/actions/notification-mark-read.handler.ts` | Domain preview for notification.mark_read |
| M | `packages/core/src/notify/actions/notification-update-prefs.handler.ts` | Domain preview for notification.update_prefs |
| C | `packages/core/src/notify/actions/previews/notification-mark-read.handler.preview.ts` | Scoped preview helper for packages/core/src/notify/actions/notification-mark-read.handler.ts |
| C | `packages/core/src/notify/actions/previews/notification-update-prefs.handler.preview.ts` | Scoped preview helper for packages/core/src/notify/actions/notification-update-prefs.handler.ts |
| M | `packages/core/src/sales/orders/actions/order-create.handlers.ts` | Domain preview for order.create, order.create_from_quote, order.create_from_contract |
| M | `packages/core/src/sales/orders/actions/order-edit.handlers.ts` | Domain preview for order.update, order.set_deposit, order.update_shipping |
| M | `packages/core/src/sales/orders/actions/order-flow.handlers.ts` | Domain preview for order.confirm, order.complete, order.cancel |
| M | `packages/core/src/sales/orders/actions/order-from-appointment.handler.ts` | Domain preview for order.create_from_appointment |
| C | `packages/core/src/sales/orders/actions/order-read.handlers.ts` | Bounded reads sharing UI query services |
| M | `packages/core/src/sales/orders/actions/order-sync.handler.ts` | Domain preview for order.sync_now |
| C | `packages/core/src/sales/orders/previews/order-create.handlers.preview.ts` | Scoped preview helper for packages/core/src/sales/orders/actions/order-create.handlers.ts |
| C | `packages/core/src/sales/orders/previews/order-edit.handlers.preview.ts` | Scoped preview helper for packages/core/src/sales/orders/actions/order-edit.handlers.ts |
| C | `packages/core/src/sales/orders/previews/order-flow.handlers.preview.ts` | Scoped preview helper for packages/core/src/sales/orders/actions/order-flow.handlers.ts |
| C | `packages/core/src/sales/orders/previews/order-from-appointment.handler.preview.ts` | Scoped preview helper for packages/core/src/sales/orders/actions/order-from-appointment.handler.ts |
| C | `packages/core/src/sales/orders/previews/order-sync.handler.preview.ts` | Scoped preview helper for packages/core/src/sales/orders/actions/order-sync.handler.ts |
| M | `packages/core/src/sales/orders/services/orders-read.service.ts` | Current authority, scoped shared query, preview or transport wiring |
| M | `packages/core/src/sales/payments/actions/finance-config.handlers.ts` | Domain preview for payment_account.update, bank_feed.connect, bank_feed.disconnect |
| M | `packages/core/src/sales/payments/actions/invoice-pay.handlers.ts` | Domain preview for invoice.record_payment, invoice.resolve_bank_match |
| C | `packages/core/src/sales/payments/actions/invoice-read.handlers.ts` | Bounded reads sharing UI query services |
| M | `packages/core/src/sales/payments/actions/invoice-write.handlers.ts` | Domain preview for invoice.create, invoice.send_payment_qr, invoice.void |
| M | `packages/core/src/sales/payments/actions/package.handlers.ts` | Domain preview for package.extend, package.adjust_sessions |
| M | `packages/core/src/sales/payments/actions/refund.handlers.ts` | Domain preview for payment.refund, payment.refund_approve, payment.refund_reject |
| C | `packages/core/src/sales/payments/previews/finance-config.handlers.preview.ts` | Scoped preview helper for packages/core/src/sales/payments/actions/finance-config.handlers.ts |
| C | `packages/core/src/sales/payments/previews/invoice-pay.handlers.preview.ts` | Scoped preview helper for packages/core/src/sales/payments/actions/invoice-pay.handlers.ts |
| C | `packages/core/src/sales/payments/previews/invoice-write.handlers.preview.ts` | Scoped preview helper for packages/core/src/sales/payments/actions/invoice-write.handlers.ts |
| C | `packages/core/src/sales/payments/previews/package.handlers.preview.ts` | Scoped preview helper for packages/core/src/sales/payments/actions/package.handlers.ts |
| C | `packages/core/src/sales/payments/previews/refund.handlers.preview.ts` | Scoped preview helper for packages/core/src/sales/payments/actions/refund.handlers.ts |
| M | `packages/core/src/sales/payments/services/invoices-read.service.ts` | Current authority, scoped shared query, preview or transport wiring |
| M | `packages/core/src/sales/quotes/actions/quote-approval.handlers.ts` | Domain preview for quote.submit_for_approval, quote.approve, quote.reject_internal |
| M | `packages/core/src/sales/quotes/actions/quote-decide.handlers.ts` | Domain preview for quote.mark_accepted, quote.mark_rejected, quote.request_revision |
| M | `packages/core/src/sales/quotes/actions/quote-draft.handler.ts` | Domain preview for quote.draft_from_content |
| C | `packages/core/src/sales/quotes/actions/quote-read.handlers.ts` | Bounded reads sharing UI query services |
| M | `packages/core/src/sales/quotes/actions/quote-send.handlers.ts` | Domain preview for quote.send, quote.extend_validity |
| M | `packages/core/src/sales/quotes/actions/quote-write.handlers.ts` | Domain preview for quote.create, quote.update, quote.delete, quote.comment |
| C | `packages/core/src/sales/quotes/previews/quote-approval.handlers.preview.ts` | Scoped preview helper for packages/core/src/sales/quotes/actions/quote-approval.handlers.ts |
| C | `packages/core/src/sales/quotes/previews/quote-decide.handlers.preview.ts` | Scoped preview helper for packages/core/src/sales/quotes/actions/quote-decide.handlers.ts |
| C | `packages/core/src/sales/quotes/previews/quote-draft.handler.preview.ts` | Scoped preview helper for packages/core/src/sales/quotes/actions/quote-draft.handler.ts |
| C | `packages/core/src/sales/quotes/previews/quote-send.handlers.preview.ts` | Scoped preview helper for packages/core/src/sales/quotes/actions/quote-send.handlers.ts |
| C | `packages/core/src/sales/quotes/previews/quote-write.handlers.preview.ts` | Scoped preview helper for packages/core/src/sales/quotes/actions/quote-write.handlers.ts |
| M | `packages/core/src/sales/quotes/services/quotes-read.service.ts` | Current authority, scoped shared query, preview or transport wiring |
| M | `packages/core/src/sales/sales.module.ts` | Read handler registration |
| C | `packages/core/src/support/actions/previews/sla-config.handlers.preview.ts` | Scoped preview helper for packages/core/src/support/actions/sla-config.handlers.ts |
| C | `packages/core/src/support/actions/previews/ticket-create.handler.preview.ts` | Scoped preview helper for packages/core/src/support/actions/ticket-create.handler.ts |
| C | `packages/core/src/support/actions/previews/ticket-edit.handlers.preview.ts` | Scoped preview helper for packages/core/src/support/actions/ticket-edit.handlers.ts |
| C | `packages/core/src/support/actions/previews/ticket-flow.handlers.preview.ts` | Scoped preview helper for packages/core/src/support/actions/ticket-flow.handlers.ts |
| M | `packages/core/src/support/actions/sla-config.handlers.ts` | Domain preview for sla.update_default, ticket.search |
| M | `packages/core/src/support/actions/ticket-create.handler.ts` | Domain preview for ticket.create |
| M | `packages/core/src/support/actions/ticket-edit.handlers.ts` | Domain preview for ticket.assign, ticket.bulk_update, ticket.update, ticket.comment |
| M | `packages/core/src/support/actions/ticket-flow.handlers.ts` | Domain preview for ticket.set_status, ticket.close, ticket.reopen |
| C | `packages/core/src/support/actions/ticket-read.handlers.ts` | Bounded reads sharing UI query services |
| M | `packages/core/src/support/services/tickets-read.service.ts` | Current authority, scoped shared query, preview or transport wiring |
| M | `packages/core/src/support/support.module.ts` | Read handler registration |
| C | `packages/core/test/agent-current-authority.test.ts` | Extracted implementation or targeted evidence |
| C | `packages/core/test/appointment-update.test.ts` | Explicit integration seam |
| C | `packages/core/test/assistant-canonical-input.test.ts` | Extracted implementation or targeted evidence |
| C | `packages/core/test/assistant-coverage.debt.ts` | Danh sách nợ preview R1 (chỉ giảm, R2 = rỗng) tách khỏi test |
| C | `packages/core/test/assistant-coverage.test.ts` | Extracted implementation or targeted evidence |
| C | `packages/core/test/assistant-custom-schema.test.ts` | Extracted implementation or targeted evidence |
| C | `packages/core/test/assistant-implemented-tools.test.ts` | Extracted implementation or targeted evidence |
| M | `packages/core/test/assistant-unit.test.ts` | find_actions fail-closed theo handler thật + khuôn schema lồng nhau (R1.1/R1.2) |
| C | `packages/core/test/assistant-preview-edit.test.ts` | Extracted implementation or targeted evidence |
| C | `packages/core/test/group-request-state.test.ts` | Explicit integration seam |
| M | `packages/db/prisma/tenant/channels.prisma` | Runtime/contract/wiring |
| C | `packages/db/prisma/tenant/migrations/20261102002310_assistant_groups/migration.sql` | Extracted implementation or targeted evidence |
| M | `packages/shared/src/api/assistant.ts` | Runtime/contract/wiring |
| C | `packages/shared/src/api/conversation-groups.ts` | Explicit integration seam |
| M | `packages/shared/src/i18n/server/en/ai.ts` | Localized domain preview |
| M | `packages/shared/src/i18n/server/en/billing.ts` | Localized domain preview |
| M | `packages/shared/src/i18n/server/en/booking.ts` | Localized domain preview |
| M | `packages/shared/src/i18n/server/en/catalog.ts` | Localized domain preview |
| M | `packages/shared/src/i18n/server/en/channels.ts` | Localized domain preview |
| M | `packages/shared/src/i18n/server/en/crm.ts` | Localized domain preview |
| M | `packages/shared/src/i18n/server/en/documents.ts` | Localized domain preview |
| M | `packages/shared/src/i18n/server/en/inbox.ts` | Localized domain preview |
| M | `packages/shared/src/i18n/server/en/notify.ts` | Localized domain preview |
| M | `packages/shared/src/i18n/server/en/sales.ts` | Localized domain preview |
| M | `packages/shared/src/i18n/server/en/support.ts` | Localized domain preview |
| M | `packages/shared/src/i18n/server/vi/ai.ts` | Localized domain preview |
| M | `packages/shared/src/i18n/server/vi/billing.ts` | Localized domain preview |
| M | `packages/shared/src/i18n/server/vi/booking.ts` | Localized domain preview |
| M | `packages/shared/src/i18n/server/vi/catalog.ts` | Localized domain preview |
| M | `packages/shared/src/i18n/server/vi/channels.ts` | Localized domain preview |
| M | `packages/shared/src/i18n/server/vi/crm.ts` | Localized domain preview |
| M | `packages/shared/src/i18n/server/vi/documents.ts` | Localized domain preview |
| M | `packages/shared/src/i18n/server/vi/inbox.ts` | Localized domain preview |
| M | `packages/shared/src/i18n/server/vi/notify.ts` | Localized domain preview |
| M | `packages/shared/src/i18n/server/vi/sales.ts` | Localized domain preview |
| M | `packages/shared/src/i18n/server/vi/support.ts` | Localized domain preview |
| M | `pnpm-lock.yaml` | Runtime/contract/wiring |
| M | `pnpm-workspace.yaml` | Runtime/contract/wiring |
| C | `tools/ai-live/cases.yaml` | Extracted implementation or targeted evidence |
| C | `tools/ai-live/package.json` | Extracted implementation or targeted evidence |
| C | `tools/ai-live/src/cases.ts` | Extracted implementation or targeted evidence |
| C | `tools/ai-live/src/cli.ts` | Extracted implementation or targeted evidence |
| C | `tools/ai-live/src/report.ts` | Extracted implementation or targeted evidence |
| C | `tools/ai-live/src/runner.ts` | Extracted implementation or targeted evidence |
| C | `tools/ai-live/src/safety.ts` | Extracted implementation or targeted evidence |
| C | `tools/ai-live/test/cases-cli.test.ts` | Extracted implementation or targeted evidence |
| C | `tools/ai-live/test/safety.test.ts` | Extracted implementation or targeted evidence |
| C | `tools/ai-live/tsconfig.json` | Extracted implementation or targeted evidence |
| C | `tools/parity/manifests/assistant-coverage.ts` | Extracted implementation or targeted evidence |
| M | `tools/parity/parity.manifest.ts` | Runtime/contract/wiring |
