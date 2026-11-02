# Billing planning audit — 2026-11-02

## Kết quả, không phải nghiệm thu runtime

Thêm TIP039 billing-lifecycle:68 file (41M/27C),10 AC, Q031 gate tiền/kỳ. Gán4 orphan DEF0091/0094/0102 vàCOM10-3; thêm DEF0105 replayentitlement vàQ031. COVERAGE1465 dòng/211 orphan gaps. Chỉ Markdown; không source change, không chạy builder tests, chưa independent review.

## Evidence và tác động

1. billing-read.service.ts:73 channels.used=0, WalletLedger chỉ localfilter trên embedded50records → task4/AC07.
2. wallet.service.ts:104 resetPlan đúng táchplan/topup nhưng chưa scheduler; subscriptions.activate:91–105 upsert kỳ trước ledgerduplicatecheck. Fulfil retry ở ngày khác có thể dời kỳ dù credit không grantlại → DEF0105 task2/AC02. Chưa có testcase tái hiện, không đánh ĐẠT.
3. fulfil.ts:39 upgrade_proration gọiactivate mua mới; addon:51 không entitlement nhưng vẫn fulfilled. Backfill phải xétpaid đãfulfilled, không chỉunfulfilled → task2/AC03–04.
4. credits.exhausted chỉ phát, reply.service handoff từngrun; task3/AC05 nhận batchconsumer recheck currentbalance, delayedstaleevent, restored không auto chiếmconversation human.
5. wallet.emit claimflag rồitenantoutbox có crashgap;045b bridge làprereq,039 fault-test billing không giữ comment làm bằng chứngatomic.
6. DC034 kỳ30ngày và suggested keyyyyy-mm có thể collision. COMMERCE §10 chỉchốt tiềnupgrade theo ngày+creditchênh, chưa đủ quyếtfraction/addonexpiry. Đã hỏi Q031; không tự mởgiá hoặc nâng quyền.
7. BillingJobs queue scheduler comment “bỏ qua jobkhác” cần kiểm routing; sales/booking hiện queue riêng. Chưa đủ chứng cứ kết luận crossdomain job đang bị nuốt; pack buộc dedicatedqueue/dispatcher chuẩn.

## Boundaries

039 không đổi commerce, khôngdropdatabase; expiredpaid giữdata30ngày và041 xử lý archive/delete.040 quảntrị nền tảng, không đểworkspaceOwner tựconfirmpaid. Cácphần price/period phảiQ031 trảlời và thêm numericAC trướcbuild. Runtimecredits assertions hiệncó không coi là proof popup hoặc recurringgrant.

## Validation

68manifestpaths unique: M tồn tại,C chưa tồn tại;10AC;14pendingTIP có bilateral overlap trước tạo.006–035 TIPfiles giữ nguyên, chỉappend reports009/010. Merge1465 unique rows,211gaps; toàn bộ changesMarkdown. Chưa kiểm độc lập, chưagọi source test/provider thật; lệnh test trongTIP làtương lai.

## Còn lại

040/041/044–046 vàsupplementals,6pendingcũ,7parts deferredaudit,wholegraph/overlap/exclusions/ownerDONE audit vàindependentreview. GoalA chưa xong; không bắtđầu code.
