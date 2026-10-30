# Sổ lệch spec (goal backend)

> Luật: `goals/GOAL-BACKEND.md` → "Ba sổ của goal" · `BUILDER-HANDOFF.md` → Escalation (L1 ghi vào đây; L2 hỏi trước rồi ghi).
> Ghi chỗ code **cố ý khác** Blueprint / standards / contract FE: thư viện ngoài tech stack, đổi schema action / shape đọc, đổi thứ tự hay phạm vi TIP, đổi cấu trúc thư mục, bỏ / hoãn một phần TIP.
> Lệch **prototype** (UI) ghi ở `docs/06-prototype/DEVIATIONS.md` (PD-xxx), không ghi ở đây.
> Thêm dòng ở cuối, không đánh lại số.

## Trạng thái

- `đề xuất` — thợ ghi khi làm (L1 được làm luôn; L2 đã hỏi Chủ thầu).
- `duyệt` — Chủ thầu duyệt lúc verify (lệch có tính chung thì đưa vào Blueprint / standard và ghi mục đã sửa).
- `từ chối` — sửa code về đúng spec.

## Sổ

| DV | TIP | Spec gốc (file · mục) | Code làm | Lý do | Mức | Ảnh hưởng | Trạng thái |
|----|-----|-----------------------|----------|-------|-----|-----------|-----------|
| DV-001 | 001 | `standards/code/file-size-module-layout.md` §6 (không vòng phụ thuộc) · D59 `pnpm depcheck` | Luật `no-circular` chặn ở mọi package backend + `packages/*`; riêng `apps/web` là `warn` (`no-circular-web`), 99 vòng hiện có ghi baseline `.dependency-cruiser-known-violations.json` — `pnpm depcheck` chỉ đỏ khi có vòng **mới** | Vòng có từ goal FE: barrel `features/*/index.ts` import chéo (customers ↔ quotes / orders / contracts, settings ↔ agents) và mock transport (`store` ↔ `domains/*` ↔ `handlers` / `routes`). Gỡ cần refactor FE ngoài phạm vi TIP-001 | L1 | Không đổi hành vi; vòng mock tự hết khi module nối `http` (TIP 011, 013, 025…); vòng barrel gỡ khi TIP nối API của module chạm tới — xoá dòng khỏi baseline (`npx depcruise … --output-type baseline`) | đề xuất |
