# fixtures/prototype-parity

Dữ liệu mẫu trích **nguyên văn** từ prototype `coding-packs/docs/06-prototype/AppChat.dc.html` (state L7668+ và template) để parity khớp. Mock transport (`apps/web/src/shared/api/mock`) đọc các file này. Không sửa giá trị cho "đẹp" — muốn đổi thì đổi theo prototype.

| File | Nguồn prototype |
|------|-----------------|
| `shell.json` | rail (badge L828–846), thông báo L907–910, menu avatar + workspace L1034–1045, ví L1063 |
| `auth.json` | auth + onboarding: email mẫu L501, tra MST L11778 (doLookup), thẻ brand L620–626, số liệu L628–630 |
| `calendar.json` | Lịch hẹn bkGroups / bkMonthCells L11096–11160 — sinh bởi `tools/scripts/fixtures/gen-calendar.py` (ngoại lệ ghi đầu script) |
| `tickets.json` | Ticket TKDATA L8690–8705, tkdMacros / tkAiSuggests L9171–9187 — sinh bởi `tools/scripts/fixtures/gen-tickets.py` |
| `marketing.json` | Chiến dịch CAMP L8730–8764 (kênh → Zalo cá nhân / Email), A/B · lịch gửi L8782–8783, đề xuất AI L9041–9093, khách wizard L8983–9023, người nhận L9025–9039 — sinh bởi `tools/scripts/fixtures/gen-marketing.py` |
| `loyalty.json` | Tổng quan / thành viên / cảnh báo rời bỏ / quy tắc prototype L4412–4740 + lyAdd L11498–11570; hạng, hệ số, sổ điểm tính lại theo COMMERCE §7 — sinh bởi `tools/scripts/fixtures/gen-loyalty.py` |
