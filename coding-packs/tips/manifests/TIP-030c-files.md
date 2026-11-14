# TIP-030c — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/core/src/contracts/services/public-sign.service.ts` | Canonical signing facade/OTP generation/current source and authority; preserve successful response shapes |
| M | `packages/core/src/contracts/services/contracts-read.service.ts` | Canonical signing facade/OTP generation/current source and authority; preserve successful response shapes |
| M | `packages/core/src/contracts/services/contract-system.ts` | Canonical signing facade/OTP generation/current source and authority; preserve successful response shapes |
| M | `packages/core/src/contracts/services/sign-link.ts` | Canonical signing facade/OTP generation/current source and authority; preserve successful response shapes |
| M | `packages/core/src/contracts/actions/contract-approval.handlers.ts` | Canonical signing facade/OTP generation/current source and authority; preserve successful response shapes |
| M | `packages/core/src/contracts/contracts.module.ts` | Canonical signing facade/OTP generation/current source and authority; preserve successful response shapes |
| M | `packages/core/src/contracts/public.ts` | Canonical signing facade/OTP generation/current source and authority; preserve successful response shapes |
| M | `packages/core/src/index.ts` | Canonical signing facade/OTP generation/current source and authority; preserve successful response shapes |
| M | `packages/actions/src/contracts.ts` | Canonical signing facade/OTP generation/current source and authority; preserve successful response shapes |
| M | `packages/actions/src/index.ts` | Canonical signing facade/OTP generation/current source and authority; preserve successful response shapes |
| M | `apps/api/src/http/contracts/public-sign.controller.ts` | Canonical signing facade/OTP generation/current source and authority; preserve successful response shapes |
| M | `apps/api/src/http/contracts/contracts.controller.ts` | Canonical signing facade/OTP generation/current source and authority; preserve successful response shapes |
| M | `packages/shared/src/api/contracts.ts` | Canonical signing facade/OTP generation/current source and authority; preserve successful response shapes |
| M | `packages/shared/src/api/index.ts` | Canonical signing facade/OTP generation/current source and authority; preserve successful response shapes |
| M | `packages/db/prisma/tenant/contracts.prisma` | Canonical signing facade/OTP generation/current source and authority; preserve successful response shapes |
| M | `apps/web/src/features/contracts/api.ts` | Stable request identity/retry and useAction Owner OTP; mock/http and vi/en parity |
| M | `apps/web/src/features/contracts/types.ts` | Stable request identity/retry and useAction Owner OTP; mock/http and vi/en parity |
| M | `apps/web/src/features/contracts/components/SignForm.tsx` | Stable request identity/retry and useAction Owner OTP; mock/http and vi/en parity |
| M | `apps/web/src/features/contracts/components/SignModals.tsx` | Stable request identity/retry and useAction Owner OTP; mock/http and vi/en parity |
| M | `apps/web/src/shared/api/mock/domains/contracts-sign.ts` | Stable request identity/retry and useAction Owner OTP; mock/http and vi/en parity |
| M | `apps/web/src/shared/api/mock/domains/contracts-actions.ts` | Stable request identity/retry and useAction Owner OTP; mock/http and vi/en parity |
| M | `apps/web/src/shared/api/mock/mock-transport.ts` | Stable request identity/retry and useAction Owner OTP; mock/http and vi/en parity |
| M | `apps/web/src/shared/api/mock/contracts-shape.test.ts` | Stable request identity/retry and useAction Owner OTP; mock/http and vi/en parity |
| M | `apps/web/messages/vi/contracts.json` | Stable request identity/retry and useAction Owner OTP; mock/http and vi/en parity |
| M | `apps/web/messages/en/contracts.json` | Stable request identity/retry and useAction Owner OTP; mock/http and vi/en parity |
| M | `apps/web/messages/vi/actions.json` | Stable request identity/retry and useAction Owner OTP; mock/http and vi/en parity |
| M | `apps/web/messages/en/actions.json` | Stable request identity/retry and useAction Owner OTP; mock/http and vi/en parity |
| M | `packages/core/src/kernel/privacy/inventory.ts` | Predecessor private capability/read/privacy and actual handler/recovery composition |
| M | `packages/core/src/kernel/privacy/cleanup.ts` | Predecessor private capability/read/privacy and actual handler/recovery composition |
| M | `packages/core/src/privacy/services/source-catalog.ts` | Predecessor private capability/read/privacy and actual handler/recovery composition |
| M | `packages/core/src/privacy/services/read-catalog.ts` | Predecessor private capability/read/privacy and actual handler/recovery composition |
| M | `packages/core/src/privacy/services/write-catalog.ts` | Predecessor private capability/read/privacy and actual handler/recovery composition |
| M | `packages/core/src/kernel/actions/system/registry.ts` | Predecessor private capability/read/privacy and actual handler/recovery composition |
| M | `packages/core/src/kernel/actions/system/admission.ts` | Predecessor private capability/read/privacy and actual handler/recovery composition |
| M | `packages/core/src/contracts/jobs/contracts.jobs.module.ts` | Predecessor private capability/read/privacy and actual handler/recovery composition |
| M | `packages/core/src/contracts/files/source.ts` | Predecessor private capability/read/privacy and actual handler/recovery composition |
| M | `packages/core/src/ai/assistant/catalog.ts` | Predecessor private capability/read/privacy and actual handler/recovery composition |
| M | `apps/worker/src/roles/jobs.module.ts` | Predecessor private capability/read/privacy and actual handler/recovery composition |
| M | `apps/worker/src/roles/ai.module.ts` | Predecessor private capability/read/privacy and actual handler/recovery composition |
| C | `packages/actions/src/contract-signing.ts` | Public-token private actions and human Owner OTP request definition |
| C | `packages/core/src/contracts/signing/module.ts` | Single-responsibility parent signing lifecycle; no appendix policy duplication |
| C | `packages/core/src/contracts/signing/capability.ts` | Single-responsibility parent signing lifecycle; no appendix policy duplication |
| C | `packages/core/src/contracts/signing/public.handlers.ts` | Single-responsibility parent signing lifecycle; no appendix policy duplication |
| C | `packages/core/src/contracts/signing/owner-otp.handler.ts` | Single-responsibility parent signing lifecycle; no appendix policy duplication |
| C | `packages/core/src/contracts/signing/attempt.handlers.ts` | Single-responsibility parent signing lifecycle; no appendix policy duplication |
| C | `packages/core/src/contracts/signing/attempts.ts` | Single-responsibility parent signing lifecycle; no appendix policy duplication |
| C | `packages/core/src/contracts/signing/otp.ts` | Single-responsibility parent signing lifecycle; no appendix policy duplication |
| C | `packages/core/src/contracts/signing/render.ts` | Single-responsibility parent signing lifecycle; no appendix policy duplication |
| C | `packages/core/src/contracts/signing/finalize.ts` | Single-responsibility parent signing lifecycle; no appendix policy duplication |
| C | `packages/core/src/contracts/signing/read.ts` | Single-responsibility parent signing lifecycle; no appendix policy duplication |
| C | `packages/core/src/contracts/signing/delivery.ts` | Single-responsibility parent signing lifecycle; no appendix policy duplication |
| C | `packages/core/src/contracts/signing/recovery.ts` | Single-responsibility parent signing lifecycle; no appendix policy duplication |
| C | `packages/core/src/contracts/signing/redaction.ts` | Single-responsibility parent signing lifecycle; no appendix policy duplication |
| C | `packages/db/prisma/tenant/contract-signing.prisma` | Durable attempts/delivery receipts, OTP generation and query indexes |
| C | `packages/db/prisma/tenant/migrations/20261102003030_parent_signing_receipts/migration.sql` | Durable attempts/delivery receipts, OTP generation and query indexes |
| C | `apps/web/src/features/contracts/hooks/useSigningAttempt.ts` | Bounded orchestrators for stable request identity; no persisted OTP/signature |
| C | `apps/web/src/features/contracts/hooks/useOwnerSigning.ts` | Bounded orchestrators for stable request identity; no persisted OTP/signature |
| C | `packages/core/test/contract-signing-capability.test.ts` | Dedicated signing boundary/replay/concurrency/failure tests |
| C | `packages/core/test/contract-signing-attempts.test.ts` | Dedicated signing boundary/replay/concurrency/failure tests |
| C | `packages/core/test/contract-signing-otp.test.ts` | Dedicated signing boundary/replay/concurrency/failure tests |
| C | `packages/core/test/contract-signing-render.test.ts` | Dedicated signing boundary/replay/concurrency/failure tests |
| C | `packages/core/test/contract-signing-delivery.test.ts` | Dedicated signing boundary/replay/concurrency/failure tests |
| C | `packages/core/test/contract-signing-privacy.test.ts` | Dedicated signing boundary/replay/concurrency/failure tests |
| C | `packages/actions/test/contract-signing.test.ts` | Definition exposure/permission/validation tests |
| C | `apps/api/test/integration/contract-signing-atomicity.test.ts` | Native contract/signature/PDF/source-generation and current authz tests |
| C | `apps/api/test/integration/contract-signing-public.test.ts` | Native contract/signature/PDF/source-generation and current authz tests |
| C | `apps/api/test/integration/contract-signing-recovery.test.ts` | Native contract/signature/PDF/source-generation and current authz tests |
| C | `apps/worker/test/integration/contract-signing-composition.test.ts` | Actual role wiring and mock/http success/error/retry UI contract |
| C | `apps/web/src/features/contracts/signing.test.tsx` | Actual role wiring and mock/http success/error/retry UI contract |
| M | `packages/shared/src/log/redact.ts` | Explicit OTP/signature/token material redaction keys for all safe logs |
| M | `apps/web/src/features/contracts/screens/SignScreen.tsx` | Mount explicit visit/open hook separately from GET query, including read-only state branches |

## Future M provenance

- `packages/core/src/kernel/privacy/inventory.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/kernel/privacy/cleanup.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/privacy/services/source-catalog.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/privacy/services/read-catalog.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/privacy/services/write-catalog.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/kernel/actions/system/registry.ts`: TIP-003c-system-actions.md
- `packages/core/src/kernel/actions/system/admission.ts`: TIP-003c-system-actions.md
- `packages/core/src/contracts/files/source.ts`: TIP-030b-contract-files.md
