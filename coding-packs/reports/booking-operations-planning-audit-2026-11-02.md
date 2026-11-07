# Booking operations planning audit — 2026-11-02

Docs only, no implementation/native data/services changes. TIP033b exact124paths,14futureM,29bilateralpairs,10owned IDs. DC261. Source evidence and measurable8AC in mainTIP; runtime notrun.

## Source findings
- D52d: shared appointment-state42 terminalexpired contradicts source requirement; flowhandler42–60 bareconfirm lacks EXCLUDE guard/reacquisition; restore24–33 status-only. Drawer38 excludesexpired. Package reservation query appointment-write52 releasesexpired capacity.
- Config: booking-config.handlers33–38 filtersclosed rows; slotswindow absenceinheritsbusinesshours. Staff/BookingSetting schema lacksversions; deactivate onlystart>=now missesalreadyrunning. No Settings registry bookingUI. Exclude_id notauthorized; currentbuffer applied to historicaloccupancy.
- Packages: invoicescontroller61–63 usescrm.view; reader168–179 unboundedfetch thenN+1scope. Noagentread action or package360block. Calendarreader43/73–75 directlyemits packagebalances throughbookingvisibility.
- REQ-G01 downgraded ĐẠT→MỘT PHẦN: calendarview tests do notprove missing settings/offdaycorrectness. No runtimepromotions.

## Defined implementation boundaries
Samecanonicalactions, contact/financial roots→setting→staff→appointment totalorder, explicitoff/inherit/CAS, expiredsameIDreacquisition withoutdebit/neworder, guarded24h inverse, persistedblockEnd and authorizedexclude. Native23P01 uses standard SLOT_TAKEN409 withlegacyclientcompatibility, no moneylaw change.

Package reader preserves crm.view plus existingrecordpolicy/currentfamily/fieldmask, batchescalendar projection too. Sharedcard wiresexistingCRM+Inbox360; settingsschema/libraryaddsoptionalpackages withoutoverwritinglayouts. Export-onlycustomer_packages actualCSV/XLSX through038b andproperjobsDI; directbalanceimport isunsupported. AI-first8livecases plusmanualnolLM.

## Independent draft review and corrections
Two existing independent reviewers audited code/TIP/manifest read-only:
1. False service applicability snapshot from032b: removed.032b freezesgrant/session/validity/producttype, notservicecomponents; preservecurrentproductComponent semantics, nofakehistoricalbackfill.
2. Calendar package projection bypass: sameauthorizedbatchreader, deniedpackage nullfields, lightweightmodule import andHTTP/mock/AItests.
3. Unsupported --suite live flag: use documented --cases fixtures/ai-eval/booking-operations.json.
4. DST ambiguous walltime lackswriteidentity: omitambiguousslots anddirectwrite422, explicitroundtripAC; nooffsetcontractinvented.
5. Missing transferDI: exactDataTransferModule+JobsModule imports/exports andactualfile ROLE=jobs test.
Both reviewers recheckedcurrentdraft andclosedlocalfindings; no newconcreteblocker in theirscope. Not fullindependentauditPASS.

## Authoring checks
Temporaryvalidator:10requiredsections,124uniqueexactM/Cpaths,14futureM backedbycreator,29pairsexactsharedpaths declaredbilaterally,10COVERAGEowners. Generatedledger1523rows/135unownedgaps; statesĐẠT545/CHỜTK41/MỘTPHẦN376/CHƯA343/GIẢ118/NGOÀI34/QUYTẮC66. gitdiff whitespace anddocs-only/DONETIPimmutability checks requiredbeforecommit. Native/unit/E2E/parity/live notrun: documentationphase only.

## Continue
Q033/Q034 approvals already recorded DC259/260. Continue015cprivacy matrix,023dAssistantinteraction/utilities, kernel eventintegrity andremainingsevenparts/fullgraph. Thischeckpoint isnotstopcondition orruntimecompletion.
