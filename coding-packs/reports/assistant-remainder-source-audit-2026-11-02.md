# Assistant remainder source audit — 2026-11-02

Docs-only source investigation with independent reviewer audit_blueprint_remainder; parent checked catalog/meta-tools/sessions/turn/composer/translate/action/runtime schemas. No runtime checks or new owner assignment from reserved names. Split cohesive units rather than one monolithic Assistant pack.

## Candidate023d — editable/reusable plans and selected agent
IDs REQ-E03d/E04b/E11b. ComposerPopovers92–95 stores agent.name rather than ID; api36–51/hook57 omitselection from request, home.read30–44 also offerspaused agents. Backend delegate30–33 already supports publishedagent byID. Needstable agent_id throughout requestledger/session/run, active/published/currentgrant recheck andno silentfallback; selection not permission andChat remainsreadonly. Usertier versus publishedagenttier must be explicit.

meta-tools73–79 saves raw JSON steps read→write withoutCAS; noeditableplan/provenance/actualreceipt projection; FE missingplan renderer. Need revision+stable steps, currentaction receipts not modelclaimedDone, editsonlypendingwork after019b fences, no rollbackpromise forcompleted effects. Reuse isnewproposal scoped to currentuser/workspace, notreplay ofoldtoken/secret/targets/authority; freshresolution/confirmations.023c retainsSSE/sessionpagination/requestledger/GenUI,023b actionpreviews and019b runtimecancel/usage/continuations.

## Candidate019c — four utility skills
ACT-ai.detect_intent/extract_info/score_lead/summarize absent in actions/core; Blueprint797 mandatesread+skill:true. Existing translate.handler scopesmessage andrunOnce inprepareoutsideDBtx;019b mustsupplytrustedroot/meter/childreceipt/currentfences.015b contact.summarize isdifferentdomain action, not genericai.summarize.

Needtypedboundedsource/text/extractionschema/taxonomy/score/evidence/uncertainty; currentauthorizedreaders, no claims that callertextprovesCRMfact. Read-only outputs: no scorepersistence/intent→quoteaccept/memorywrite. No extraactiontools/providerSDK path, no automaticgrants. Exactmodule/worker/registry/menus/slash/locales andtypedresultreadback needed. Live structuredoutput/deniedscope/unknownusage tests. Do notassignCOM-3-11 merelybecauseintentutilityexists;022b writer/025btranslate/023c quickcommands stayseparate.

## Candidate023e — semantic action discovery/cache
DEF-023-4 remainsunowned. catalog1–2 explicitlykeywordonlyDC129,51 staticINDEX,82–97 allwords substring thenfirst8 registryorder. Blueprint1098 embeddingcache notimplemented.023b owns nestedfullschema andhasImplementedfilter, mustretain.

Need versioneddescription/schema corpus+embeddingmodel/dimension/hash, refreshonimplementation/catalogchanges; semanticranking neverauthorization. Filtercurrentpermission/mode/implemented/agentgrants, executorrecheck; no sharedcachedauthorizedresult. Candidate-IDcache re-filtereachrequest, keywordfallbacklabelednotsemanticsuccess. Queryembeddings019brootmeter outsideDBtx, deterministicVI/ENparaphrase/ranking/revoke/stub/cachetests. No new chargeformula.

## Next
Author019c/023d/023e separately with exactmanifest+bilateralintersections beforeclaimingownership, thenindependentreview. PrivacyQ035 nowasked foropenfinancialobligations; DC259/260 remainapproved. Goalactive1523rows/135unownedgaps, no stop atthisauditcheckpoint.


##023d follow-up after privacy015c — source/design audit, not owner assignment

Latest ledger1531/129unowned;019c and015c now written/reviewed locally.023d still not written. Independent source reviewer checked proposed pause/edit and selected-agent semantics:

1. **Separate edit pause from terminal cancellation.**019b root generation/admission gates provider/tools, but accepted work must settle. Add separate plan_epoch/pause generation; stop new admissions across tree, preserve old accepted receipt/usage admission identities. Unknown outcome is not drained on timeout. Resume must preserve counters/maxSteps/budget and privacy terminal fence; run.cancel remains terminal, never reused as resumable pause.
2. **Batch engine checkpoint is mandatory.** `packages/ai/src/gateway/engine.ts:82–102` can receive multiple tool calls in one model response. Pause between calls needs executed results/receipts, pending/unadmitted calls, messages and step index checkpoint. Invalidate only unadmitted old-revision calls and preserve a valid SDK tool transcript; do not replay the whole batch. Exact engine/types/message-helper seams belong in manifest.
3. **Server owns progress.** meta-tools124–146 currently lets model replace plan and claim done. New revision/stable-step schema must distinguish proposal from actual action/child/typed-analysis-result receipt. Root-bound token binds plan/run/revision/step/action+input digest or typed execution scope, not arbitrary step ID. Cannot borrow another action/customer receipt.
4. **Pause crosses approvals/external intents.** Pending confirmation, approval, delegated child,023c GenUI intent and accepted-operation callbacks must preserve actual outcome yet not auto-resume old plan. Reason-discriminated resume must distinguish plan edit from verified external result. Only unstarted steps editable; admitted unresolved step locked.
5. **Selected agent stable through resume.** ComposerPopovers92 stores name; API36–51/hook57 omit selection; TurnRequest32–44 and resume64–71 omit it. Exact published-agent lookup already delegate30–33. Store selected_agent_id/published version in immutable turn/request hash and run input. Pause/delete/revocation/version mismatch blocks explicitly, no fallback by role/name. Root cannot execute wider business tools to bypass selected-agent grants. Root user tier/subscription remains; child published tier explicit. Chat never becomes write mode because agent selected.
6. **Reuse is a fresh proposal.** Keep structure/typed placeholders only, not old resolved IDs/inputs/results/approval handles/private snippets/completed state. Titles/prose may contain PII;015c provenance/current authority applies to reusable reader/rendering, pending edit drafts, previews and step-token caches. Unbound legacy plan not assumed reusable.

Further parent design checks before TIP authoring: complete plan mutation ActionExecutor path (including existing plan meta-tool confirmation mapping), source-aware bounded recommendations, agent picker paging/published metadata, explicit same-root pause checkpoint integration, no synthetic success, and exact manifests/bilateral overlap. No code/native/provider changes or claim that reserved023d has received these IDs yet.
