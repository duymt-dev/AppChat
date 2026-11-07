# Câu A — marketing planning audit, 2026-11-02

**PARTIAL goal, docs only.** Code snapshot41147cc. Thêm TIP037 đầy đủ cấu trúc, chưa implementation; không gửi campaign/provider thật hoặc sửa demo.

## Khảo sát và phạm vi TIP
- marketing.prisma/MarketingModule/Jobs/HTTP modules stub; marketing.ts có12 ActionDef (segment.preview + campaign.suggest +10 lifecycle actions), chưa handlers/segment CRUD.
- FE wizard giả IDs ct_n/import_xlsx và audience1180; analyze setTimeout; tone text cứng; export/resend/recipient menu chưa làm. TIP037 nhận các nghĩa vụ PRO-marketing bằng AC thực, không chỉ thêm4 GET routes.
- send-queue jobId bị retention1000, SendResultSink nuốt exception; không phải dedupe bền. TIP quy định recipient/attempt ledger, crash-after-provider-accept thành unknown, không retry mù. Không claim exactly-once không thể chứng minh.
- Zalo manifest chưa perDayProactive; send.processor snapshot cap lúcopen, đếm mỗiattempt và cap lỗi final. D35c orphan được037 nhận: default200/ngày, jitter2–6s, override warning, shared quota và retry-safe reservation, defer hôm sau.
- ROLE=channels đã cóMarketingJobsModule nhưng jobs chưa cóscheduler domain này. Manifest thêm scheduler module riêng + mộtentry jobs role, tránh nhân đôi sender worker. Notify rules nạp tường minh trong jobs process.
- CreditMeter hiện tính tokenAI; không thấy send tariff tương ứng est_credits. Đã hỏiQ-030, không tự lấy rate mock thành giá. Phần giá chưa ready-to-build.
- Blueprint permission campaign.approve cho Owner/manager ưu tiên hơn chữ “Owner” trong REQ-I04; không đổi permission bằng role-name guard.

## Artifact và gate
- TIP037:93 files (42M/51C),10 AC; schema/index, segmentsAST, immutable approval, unsubscribe, delivery ambiguity/cap/cooldown, AI/credit, imports/exports, reporting/recipient actions và provider gates.
- Attribution7ngày last-touch ởDC-240 là đề xuất kỹ thuật cần rà trướcbuild, không sửa tiền/doanh số; unsupported open/click dùng capability/null, không fake0 như measured0.
- Twelve pending TIPs đã có declaration hai chiều cho shared file trước khi tạo037; capsUI overlap bổ sung. Full batch manifest vẫn chưa đủ để claim parallel-safe toàn bộ.
- Sharedfile integration đặt037 sau042c/043/045b và các supplemental trước, trước038/044/046. SốTIP không là thứ tự build.

## Kiểm tra tài liệu
- Manifest unique + M tồn tại/C chưa tồn tại; COVERAGE sáu cột/IDunique, merge.py, diffcheck.
- Merge:1.463 dòng; ĐẠT566, CHỜ-TK42, MỘT PHẦN323, CHƯA314, GIẢ118, NGOÀI34, QUY-TẮC66; gaps216. Giảm1 vì D35c có TIP nhận; thêmQ-030 chưa duyệt.
- Lệnh unit/integration/E2E/parity/ai:live trongTIP là yêu cầu builder, **chưa chạy** ở lượt docs. Không dùng mockedsend như nghiệm thu provider thật.
- Chưa độc lập review;038–041/044–046, TIP bổ sung cho216 gaps và6TIP cũ chưa hoàn thiện. Không đánh goalDONE.

## Tiếp theo
Viết038 insights/dashboard/export từ metric registry/query_data thực; kiểm Q-024 phạm vi xuất Excel. Không chờQ-027…030 để dừng công việc domain khác. Cuối batch phải rà nghĩa vụ có owner nhưng chỉ trỏTIPDONE/CHỜ-TK và tất cả overlap, không chỉ đếm216.
