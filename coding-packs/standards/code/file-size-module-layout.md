# Code — Kích thước file & bố cục module (chống monolith)

## Quy tắc

1. **Giới hạn dòng (tính cả comment, không tính file sinh tự động / fixture):**

| Loại | Tối ưu | Trần cứng | Khi nào tách |
|---|---|---|---|
| Backend (`apps/api`, `apps/worker`, `packages/{core,ai,channels,integrations,db,actions}`) | 200–400 | **600** | ≥ 500 → tách thành thư mục con theo domain |
| Frontend (`apps/web`, `apps/widget`, `packages/ui`) | 150–250 | **400** | Màn chỉ làm orchestrator; drawer / modal / popover / sub-view → `components/`, hook → `hooks/`, type → `types.ts` |

2. **CI chặn:** `pnpm lint:size` fail khi có file vượt trần cứng (allowlist rỗng và phải giữ rỗng).
3. **Một domain một thư mục** trong `packages/core/src/<domain>/`: `<domain>.module.ts`, `services/`, `repos/`, `handlers/` (action handler), `consumers/` (event), `dto/`. Không trộn domain, ví dụ CRM với Order.
4. **Màn FE** `apps/web/app/(app)/<route>/page.tsx` ≤ 120 dòng, chỉ dựng layout và gọi component. Mỗi drawer hoặc modal là một file.
5. **Không thêm logic vào file đã gần trần.** File ≥ 500 (BE) / ≥ 350 (FE) thì tách trước, rồi mới thêm.
6. **Import một chiều:** `apps/*` → `packages/core` → `packages/{db,actions,shared,ai,channels,integrations}`. `packages/shared` không import gì nội bộ. Có lint `import/no-cycle` + `dependency-cruiser`.
7. **Stub đăng ký sẵn:** TIP-001 tạo đủ file rỗng (module, actions, prisma) cho mọi domain, để TIP sau chỉ điền nội dung chứ không cùng sửa một file index.
