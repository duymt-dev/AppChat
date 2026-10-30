# Quyết định theo đề xuất (goal backend)

> Luật: `goals/GOAL-BACKEND.md` → "Ba sổ của goal" · `standards/domain/gap-filling.md` §2, §3, §6.
> Ghi quyết định thợ **tự chốt theo đề xuất** khi thiết kế im lặng (loại "được tự quyết"), và câu hỏi ở `QUESTIONS.md` đã được Chủ nhà trả lời.
> Quyết định của Chủ nhà có mã D (D01–D58…) vẫn nằm ở `01-REQUIREMENTS-MATRIX.md` → Decisions log; sổ này dùng mã `DC-xxx`.
> Thêm dòng ở cuối, không đánh lại số. Chủ nhà / Chủ thầu đổi ý → sửa cột "Trạng thái" (`duyệt` / `tạm theo đề xuất` / `đảo ngược`), không xoá dòng.

| DC | Chỗ trống | Bậc tra cứu dừng (gap-filling §1) | Lựa chọn | Lý do | Đảo ngược thế nào | TIP | Trạng thái |
|----|-----------|-----------------------------------|----------|-------|-------------------|-----|-----------|
| DC-001 | OQ-11: quyền + nơi lưu mẫu Hồ sơ 360° | Contract FE đã có (gap-filling §5) | `settings.manage`; bảng `profile_layout` + `profile_layout_role` ở DB tenant | `packages/actions/src/settings-apps.ts` đã khai `profile_layout.*` với `settings.manage`; bản đồ sở hữu file đặt bảng ở `tenant/crm.prisma` (TIP-015) | Đổi permission ở ActionDef + seed vai trò | 015 | tạm theo đề xuất |
| DC-002 | Nơi đặt ba sổ của goal | Chủ nhà nói "trong coding-packs", không nói tên file | `coding-packs/QUESTIONS.md` · `DECISIONS.md` · `DEVIATIONS.md` (chữ hoa như các file gốc khác); sổ lệch prototype giữ ở `docs/06-prototype/DEVIATIONS.md` | Thống nhất cách đặt tên với `BUILDER-HANDOFF.md`, `README.md` | Đổi tên file + sửa liên kết trong goal | — | tạm theo đề xuất |
| DC-003 | Commit tài liệu goal backend đi theo nhánh nào | Git flow D40 chỉ nói nhánh việc → PR vào `dev` | Commit đầu tiên của nhánh `tip/001-scaffold-backend` | Goal + sổ là điều kiện để làm TIP-001; tránh một PR docs riêng chỉ có 4 file | Cherry-pick sang nhánh `docs/…` riêng nếu Chủ nhà muốn tách | 001 | tạm theo đề xuất |
| DC-004 | Công cụ cho `pnpm depcheck` (D59) | Standard `code/file-size-module-layout.md` §6 đã nêu `dependency-cruiser` | dependency-cruiser: luật import một chiều theo CLAUDE.md §3, `no-circular`, `no-non-package-json` (import gói chưa khai), chạy toàn repo | Có sẵn tên trong standard → không phải thư viện ngoài stack; một công cụ phủ được cả ranh giới lẫn khai báo phụ thuộc | Đổi script `depcheck` sang công cụ khác (knip / depcheck) + ghi DV | 001 | tạm theo đề xuất |
| DC-005 | Chế độ E2E "MSW" trong D59 | Repo không dùng MSW; FE có mock transport (`NEXT_PUBLIC_API_MODE=mock`, D38) | "MSW" hiểu là `NEXT_PUBLIC_API_MODE=mock`; "server" là `http` với backend thật | Cùng ý: một lượt chạy mock, một lượt chạy backend thật | — | tất cả | tạm theo đề xuất |
