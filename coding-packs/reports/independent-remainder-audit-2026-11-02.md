# Independent remainder audit — requirements and Blueprint

Hai reviewer riêng đọc code/spec, không sửa file hay chạy runtime: `audit_remaining_requirements`, `audit_blueprint_remainder`. Đây là bằng chứng rà tĩnh, không phải nghiệm thu hành vi.

## Requirements A–N

- C12 phải hạ ĐẠT: ThreadSearchBar.tsx:54–57 chỉEscape/Enter, khôngArrowUp/Down;37–40 chỉscrollDOM đãload; MessageBubble/ChatPanel chưahighlight. read.service.ts:119–142 search≤200 khôngpagination.025b phải nhậnkeyboard/highlight/unloadedhit.
- D04 Drive “Sắp có”: RagUploadModal:20 chỉupload, RagSection:117–130 khôngcontrolDrive; locale labelkhôngphảiUI.020b nhận disabledsource, khôngworkingOAuth.
- D09b thiếuagent: delegate.ts:43–44 trảNOT_FOUND, promptassistant khônghướngdẫncreate; genericAgentsScreen suggestionkhôngđủ.023d nhận explicitcreatepreview/cancel/permission/quota/livecase, khôngautocreateagent.
- B11 config stored accounts.service:16–21 khôngproof runtime: reply-context:93/102 chỉinjectprompt, reply.service:208 checkagenthours khôngchannelhours; pipeline:69–73 luôncreatecontact.014b nhậnsync/hours/greeting/SLA;042b giữassignment.
- G04b khôngchỉCHỜ-TK: templates.seed.ts:11 bookingdefault thiếuappointment.cancel.022b phải sửa code/default vàtest, sauđólive.
- D17c KBscope: kb-search.handler.ts:26 khôngfolder/tagcontext, delegate.ts:63 khôngpass KBscope.022b nhận end-to-end delegation/Cowork/approvalresume boundary.

## Owner clusters cần viết file, chưa coi là đã nhận

013b: A02d/A05f/A07b/M01b/M01c-logo (taxonomy,phoneinvite,auditread,logo).
014b: B02d/B03b/B04a/B11c/e/d-SLA (channelruntime);017b:B05c(widgetlogo);018b:B06b(GmailOAuth).
025b:C05d/e,C07,C08b,C09a,C10a/c,C11a,C12,G03c (Inbox);022b:D03b/D06c/D07c/D17c/F06-f/G04b/H02b(agentbehavior).
023d:E03d/E04b/E09c/E11b/E12a/b+D09b-c(assistantinteraction).
033b:F01b-4/G07e(ownerreassignbooking+packages360);042b extensionF01b-6(absentowner).
027b:F05b(productmedia);031b:F07b-3(stockmaster);012b:F08f/M03b(tenantbankrealadapters).
003b:N03b(OpenAPI);015c:N08b(privacyerase);046:N10d(a11ygate,implementationseparate).

## Blueprint additions/corrections

- §8 tax: actualVietQRadapter tax-lookup.ts:15–36 + workspaces.test.ts:194; liveproviderseparate. Excel→038b. RAG htmlBlocks regexparse.ts:34–59/ingest:62 khôngReadability;020b needs explicit task/AC.
- §9 budgets: webLCP/300KBroute; virtual lists>100; API read300ms/write500ms/inbound1s/AI8s; DB1Mrows/query100ms;99.9% availability;5UIstates/fade150ms;a11yfocus3px;i18nfullstack;RPO5min/RTO1h/weeklyrestore. Phảiatomicrows/owners, khônggộp“hardening”.
- K1 pgvectorWindowsrunbook→045 (extensiontestđãcó);K2Zalohealth/live→014b;K3LRU/PgBouncer200DBload→045;K4usage/restart/dedupe→046;K5pinversions→045/046;K6offsitebackup→045;K7DBcount/size/placement→045,archive→041 (không040);K8DOCX5samples/concurrency→030b+045;K9realmarketplaceP2/D28 nhưngframeworkP0giữ;K10AIfieldmap/numberprovenance→030b;K11scopeperf→042c;K12iterative_scan đãsearch.ts:90 nhưngexactsmallcorpus/recall chưa→020b/046.
- §11 infra/ chưa có: exporters,6dashboards,10alertcategories,logpipeline,ufw/keyonly/fail2ban/updates/nosudo/Grafana2FA/scram/TLS→045. Appmetrics/no workspace_idlabels→045b. BP11b khôngđượcĐẠTend-to-end nginx/workertrace khiinfraabsent; táchlocalimplementation vàinfra.
- §4.6 approval eventdrift: Blueprint1007 requested/decided vs agents.rules.ts:13–21 approval.changed.023c contractowner. Inboxpayload message.new IDs-only khôngtựđộngvi phạm vìBPkhôngfullDTOspec, nhưngroomscope/collaboratorfanout/revoke cần042c/045b securityregression. notifier DTO+toast/sound vàchannelstatuspayload đãđọc.
- ACT-doc_template.create thiếu24hundo (documents.ts:11–29), trongkhiupdate/delete cóundo(:52/66;handlers:99/129). PhảihạĐẠT vàgiaoactioncontractsupplemental. **Toànbảngpermission/undo chưa rà hết**, khôngxoámarkerchỉvì đãauditca này.

## Trạng thái

Findings phải được chuyển thành row/TIP/tasks vàkiểm lại. Report này giữ evidence để khôngmất giữa lượt; không đủ chứng minh toàngoal hoànthành hoặc211orphanđãđượcgán.
