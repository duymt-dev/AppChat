# TIP-001b — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `.dependency-cruiser-known-violations.json` | Xoá dần tới rỗng |
| M | `.dependency-cruiser.cjs` | Rule cấm import barrel nội bộ |
| M | `apps/web/src/shared/api/mock/routes.ts` | Registry domain mock không import ngược features |
| M | `apps/web/src/features/agents/styles/agents.styles.ts` | Bỏ @media tay |
| M | `apps/web/src/features/dashboard/components/AgentsSection.tsx` | useBreakpoint |
| M | `apps/web/src/features/inbox/components/FolderRail.tsx` | useBreakpoint |
| M | `apps/web/src/features/inbox/styles/panel.styles.ts` | Bỏ @media tay |
| M | `apps/web/src/features/settings/components/ChannelsSection.tsx` | fmt.* |
| M | `apps/web/src/features/settings/components/ManageChannelDrawer.tsx` | fmt.* |
| M | `apps/web/src/features/settings/components/WidgetSection.tsx` | fmt.* |
| M | `apps/web/src/features/settings/components/TagsSection.tsx` | fmt.* |
| M | `apps/web/src/features/assistant/components/TaskDrawer.tsx` | fmt.* + dynamic |
| M | `apps/web/src/features/loyalty/components/MemberTable.tsx` | fmt.* |
| M | `apps/web/src/features/loyalty/components/MemberTabs.tsx` | fmt.* |
| M | `apps/web/src/features/loyalty/hooks/useAdjust.ts` | fmt.* |
| M | `apps/web/src/features/loyalty/status.ts` | fmt.* |
| M | `apps/web/src/features/marketing/columns.tsx` | fmt.* |
| M | `apps/web/src/features/marketing/components/AnalyzeModal.tsx` | fmt.* |
| M | `apps/web/src/features/marketing/components/CampaignDetail.tsx` | fmt.* |
| M | `apps/web/src/features/marketing/components/CampaignWizard.tsx` | fmt.* + dynamic |
| M | `apps/web/src/features/marketing/components/DetailTabs.tsx` | fmt.* |
| M | `apps/web/src/features/marketing/components/WizardSteps.tsx` | fmt.* |
| M | `apps/web/eslint.config.mjs` | no-restricted-syntax toLocaleString/Intl |
| C | `apps/web/src/app/(app)/error.tsx` | Error boundary route app |
| C | `apps/web/src/app/(auth)/error.tsx` | Error boundary route auth |
| C | `apps/web/src/app/(public)/error.tsx` | Error boundary route public |
| C | `apps/web/src/app/global-error.tsx` | Lỗi layout gốc |
| C | `apps/web/src/shared/states/PanelBoundary.tsx` | Boundary panel phụ |
| C | `apps/web/src/shared/states/PanelBoundary.test.tsx` | Unit boundary |
| C | `apps/web/e2e/error-boundary.spec.ts` | E2E lỗi route/panel |
| C | `apps/web/src/shared/dynamic/lazy-drawers.ts` | Khai báo next/dynamic tập trung cho drawer/modal nặng |
