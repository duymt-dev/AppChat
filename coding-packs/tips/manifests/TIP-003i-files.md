# TIP-003i — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `packages/core/src/kernel/http/cursor.ts` | Cursor chuẩn |
| C | `packages/core/test/cursor.test.ts` | Unit |
| M | `packages/core/src/ai/assistant/action-logs.read.ts` | Lọc + cursor |
| M | `apps/api/src/http/ai/assistant.controller.ts` | Tham số action-logs |
| M | `apps/api/src/http/ai/ai.controller.ts` | /kb/folders, /kb/sources, /runs/:id/cancel |
| M | `packages/core/src/ai/kb/kb.read.ts` | List folders/sources |
| M | `apps/api/src/http/ai/agents.controller.ts` | Cursor |
| M | `apps/api/src/http/documents/doc-templates.controller.ts` | Cursor |
| M | `apps/api/src/http/identity/settings.controller.ts` | Cursor |
| M | `packages/core/src/booking/services/calendar-read.service.ts` | Cursor |
| M | `packages/core/src/identity/settings/settings-read.service.ts` | Cursor |
| M | `packages/core/src/billing/payments/invoices.service.ts` | Cursor |
| M | `apps/api/src/http/crm/crm-settings.controller.ts` | profile-layouts as_role |
| M | `packages/actions/src/registry.test.ts` | Kiểm bulk flag |
| M | `coding-packs/DEVIATIONS.md` | DV route hồ sơ 360 |
| C | `apps/api/test/integration/read-contracts.test.ts` | Integration |
