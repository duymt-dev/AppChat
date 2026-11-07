# TIP-022d — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/channels/src/zalo-personal/manifest.ts` | perDayProactive |
| M | `packages/core/src/channels/jobs/send.processor.ts` | Áp cap + deferred |
| M | `packages/core/src/channels/services/accounts.service.ts` | Cấu hình cap |
| C | `packages/core/test/zalo-cap.test.ts` | Unit |
