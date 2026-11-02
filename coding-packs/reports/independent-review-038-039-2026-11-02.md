# Rà độc lập TIP-038/039 — 2026-11-02

Reviewer: agent riêng `review_insights_billing`, chỉ đọc code/spec/TIP, không sửa file hoặc chạy runtime. Đây là **lượt rà một phần**, không thay lượt rà toàn COVERAGE và các TIP còn lại.

## Findings và xử lý của tác giả

1. **Manifest thiếu extraction path:** tools/parity/parity.manifest.ts có1.405 dòng; cả038/039 chỉ khai M không modulemới. Đã thêm C tools/parity/modules/insights.ts vàbilling.ts; legacy chỉ facade1–2dòng. Cần rà monolith tương tự trong toànbatch.
2. **Q031 đãduyệt nhưng stalegate:** TIP039 context/UI/checklist, taskgraph vàDEF0102 còn ghi chưachốt. Đã sửa theo DC242; ghiQ032 riêng cho phầnrounding chưađược lời duyệt3policy bao phủ. Cácreportcheckpoint trướcduyệt giữ nguyên lịch sử, handoff đã ghi quyếtđịnh mới.
3. **Credit fractionalrounding chưa có chuẩn:** money-time-numbering §1 chỉ quyđịnh VND half-up. Đã hỏiQ032 đềxuấthalf-up với ví dụ10.000×10/31→3.226; sau đó Chủ nhà duyệt half-up (DC243). Q031 không bị mở lại.
4. **Tên error sai:** TIP038 VALIDATION_ERROR không có trong shared/errors.ts:6. Đã sửa VALIDATION_FAILED, khôngthêmerrorcode mới.
5. **Coverage evidence stale:** REQL07e nóigraph039 chưamentionupgrade dù nay đãcó. Đãcậpnhật evidence, giữ CHƯA runtime.

## Những điểm reviewer xác nhận

- subscriptions.service.ts:91–95 sửa kỳ trước duplicate walletcheck; fulfil.ts:39–51 upgrade/addon có khoảngtrống đúng nhưTIP039 mô tả. Chưa có runtimefaulttest nên không tự nâng coverage.
- insights stub, csat hardcoded0 tại agents.read.ts:40, briefing teamfilter chưađúng đượcTIP038 nhận.
- Hướng DC242 củaTIP039 phùhợp phêduyệt: anchoredmonths, giữupgradeenddate, prorateplanCredit, addonđồnghạn, khôngautopay.
- CácMpath đượcsample đều tồn tại; reviewer không thấy reversal quyền/commerce trong phầnđãđọc. Khôngsuyra fullmanifest/allAC đãđược kiểm chứng độclập.

## Trạng thái còn lại

Cập nhật sau review: Chủ nhà đã duyệt Q032 half-up, ghi DC243 và fractionalfixtures; gate rounding đã gỡ. Chưa review độclập TIP040/newpacks hoặc toàn1466nghĩavụ; các thiếu khác tronggoalA vẫn còn. Không sourcechange/testprovider/liveAI tronglượt rà này.
