# TIP-011b — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `packages/shared/src/identity/industry.ts` | Danh mục |
| C | `packages/shared/src/identity/industry.test.ts` | Unit |
| M | `packages/actions/src/onboarding.ts` | industry |
| M | `packages/core/src/identity/actions/business-profile-update.handler.ts` | Lưu industry |
| M | `apps/web/src/features/onboarding/components/DeclareBusinessModal.tsx` | Cascader |
| M | `apps/web/src/features/settings/components/GeneralSection.tsx` | Sửa ngành |
| M | `apps/web/messages/vi/onboarding.json` | Nhãn ngành |
| M | `apps/web/messages/en/onboarding.json` | Industry |
| M | `coding-packs/docs/06-prototype/DEVIATIONS.md` | Lệch có chủ đích |
