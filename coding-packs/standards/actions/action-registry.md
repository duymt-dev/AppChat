# Action-first — Action Registry

> Lõi sản phẩm: mọi thao tác ghi của UI, Trợ lý AI, agent trực kênh và tác vụ đều là **một** action, chạy qua **một** `ActionExecutor`. Trợ lý điều khiển được mọi thứ người dùng bấm được, vì cả hai cùng gọi một action.

## Quy tắc

1. **Không có đường ghi thứ hai.** Thao tác nghiệp vụ thay đổi dữ liệu phải là `defineAction` + `@ActionHandler`.
   - Cấm service ghi DB được gọi thẳng từ controller hoặc từ AI tool.
2. **ID dạng `<domain>.<verb>`**, ví dụ `quote.send`, `contact.merge`.
   - Mỗi domain một file `packages/actions/src/<domain>.ts`; mỗi file thuộc đúng một TIP.
   - Boot fail nếu một id không có handler hoặc có trùng.
3. **Bắt buộc khai báo đủ:** `input` / `output` zod, `permission: PermissionKey` (xem `authz/rbac-permissions.md`), `risk`, `agentGrantable`, `invalidates`.
   - Khai báo thêm `bulk` / `undo` / `uiTarget` / `db: 'platform'` khi áp dụng.
   - **Quyền agent (D51):** `skill: true` cho action chỉ đọc thuộc nhóm "Kỹ năng AI" (risk `read`); `requiresConnector: '<channel|connector key>'` khi action cần kết nối (chưa kết nối thì tool không vào run, Builder hiện badge *Cần kết nối X*).
4. **`description` viết cho LLM** (tiếng Anh, ngắn, có ví dụ input). **`title`** là i18n key. Không có description thì `find_actions` không tìm ra, tức Trợ lý không dùng được action.
5. **Thứ tự trong Executor không đổi:**
   1. registry
   2. zod
   3. permission + data scope
   4. policy (source × risk + governance)
   5. idempotency
   6. trạng thái + phiên bản (`domain/state-machine.md`, `domain/concurrency.md`) trong transaction: handler + `action_log` + `outbox_event`
   7. trả kết quả
6. **Read action** (risk `read`) có cho mọi GET mà Trợ lý cần, ví dụ `contact.get_360`, `insight.query`. Route GET và read action gọi **chung service**.
7. **Preview:**
   - Action có risk `send`, `money`, `delete`, `config`, hoặc có `bulk`, phải có `preview()`. Preview trả diff before/after, số bản ghi và cảnh báo.
   - `confirm_token` gắn với hash của input, sống 10 phút.
8. **Undo:**
   - Action đảo ngược được thì khai `undo.windowSec` và viết `handler.undo()`.
   - Action đã gửi ra ngoài (`message.send`, `quote.send`) không undo. Dùng action bù, ví dụ `quote.revoke`.
9. **`uiTarget`** trả `UiCommand` để UI và Trợ lý deep-link tới kết quả, ví dụ mở drawer báo giá vừa tạo.
10. **`invalidates`** khai query key mà FE cần refetch. FE không tự đoán.
10b. **Quyền hiệu lực khi AI làm thay người (D51, Blueprint §3.3b):** agent trực kênh = `ai_agent.tool_ids`; agent được giao bởi Trợ lý / Cowork = quyền agent **∩** quyền người ra lệnh, kiểm lại **mỗi lần gọi tool** (không cache cho cả run).
11. **Governance cứng** (luôn approval, mọi nguồn trừ Owner bấm tay):
    - báo giá > 20.000.000₫;
    - giảm giá > 5% (agent);
    - hoàn tiền;
    - gửi hàng loạt;
    - gửi hợp đồng.
12. **Test cho mỗi action** (file riêng `*.action.test.ts`):
    - happy path;
    - thiếu quyền → 403;
    - ngoài scope → `SCOPE_FORBIDDEN`;
    - policy từng nguồn (`ui` / `assistant` / `agent`);
    - idempotency;
    - undo (nếu có);
    - sai trạng thái → `INVALID_TRANSITION`; lệch `if_version` → `STALE_VERSION` (nếu áp dụng).
13. **Action đã có trong `packages/actions` (FE dựng trước — D38) là contract:** TIP backend cài handler đúng schema đó; đổi `input` / `output` = escalation L2 (`domain/gap-filling.md` §5).

## Ví dụ

```ts
export const quoteSend = defineAction({
  id: 'quote.send', module: 'sales', title: 'actions.quote.send.title',
  description: 'Send a quote to the contact via its conversation channel. Example: {"quote_id":"…","channel":"auto"}',
  input: z.object({ quote_id: z.string().uuid(), channel: z.enum(['auto','zalo_personal','email']).default('auto') }),
  output: z.object({ quote_id: z.string(), sent_at: z.string(), expires_at: z.string() }),
  permission: 'quote.send', risk: 'send', agentGrantable: true,
  invalidates: ['quotes', 'quote', 'contact-timeline'],
  uiTarget: (o) => ({ kind: 'open_drawer', entity: 'quote', id: o.quote_id }),
});
```
