# AppChat V2 — hướng dẫn cho agent (Codex và công cụ khác)

Quy tắc dự án nằm ở **`CLAUDE.md`** (tên file theo Claude Code nhưng áp cho mọi agent) — đọc toàn bộ trước khi làm.

Đầu phiên đọc thêm **`coding-packs/HANDOFF-NEXT.md`**: trạng thái lúc dừng, việc kế tiếp, câu giao việc dán sẵn.

Goal hiện tại: **`coding-packs/goals/GOAL-RELEASE.md`** — 83 TIP chưa DONE làm tuần tự theo bảng thứ tự trong file (023b → 046), mỗi TIP một nhánh `tip/XXX-<slug>` + `gh pr create --base dev`, tới khi TIP-046 (cổng phát hành) đạt. `GOAL-BACKEND.md` chỉ còn là lịch sử TIP 001–035.

Tóm tắt luật cứng (chi tiết trong `CLAUDE.md` + `coding-packs/BUILDER-HANDOFF.md`):
- Kích thước file: backend 200–400 dòng, trần 600; frontend 150–250, trần 400; test ở file riêng.
- Action-first: mọi thao tác ghi là action trong `packages/actions` chạy qua `ActionExecutor`.
- Postgres: composite index cột `=` trước, range / sort sau; `INCLUDE` cho covering; deferred join cho list có LIMIT.
- Không đổi luật `coding-packs/plans/COMMERCE-DECISIONS.md` và quyền đã chốt.
- Git: tài liệu được push thẳng `dev`; code đi nhánh `tip/XXX-*` từ `origin/dev` → PR vào `dev`. Không PR vào `main`. Xong việc + test pass thì commit ngay, `git status --short` sạch trước khi báo xong, báo kèm git commit SHA.
- Không in / commit bí mật (`.env`, khoá mã hoá, key LLM / Brevo, mật khẩu DB).
