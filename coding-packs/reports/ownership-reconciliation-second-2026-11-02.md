# Ownership reconciliation, second pass — 2026-11-02

Independent read-only review audit_remaining_requirements, parent checked scoped task/AC/manifest anchors. Six ownership-only corrections; runtime statuses unchanged and no new implementation scope.

|ID|Owner|Evidence in current pending TIP|
|---|---|---|
|COM-10-4|039|§2 pending_plan applies once at next period; AC03; exact plan-changes.service.ts. No new billing policy.|
|DEF-015-1|015d|Task2–4/AC3 atomic contact ownership transfer includes upcoming appointment responsibility; staff/time unchanged. Obsolete asynchronous-consumer description corrected to DC254 synchronous transfer.|
|PRO-settings-audit|045b|Contracts A2 GET/settings/audit+current projection; AC3/mainAC2; AuditSection/AuditTable/controller/audit-read/native hardening-audit.test exact paths.|
|PRO-settings-aiaudit|045b|Same A2, scoped AI metadata route/UI AiAuditTable and current field/privacy projection; no raw prompt exposure.|
|PRO-assistant-sessions|023c|Session/search pagination and reopen/workspace safety task/AC8; SessionBrowser/useAssistantSessions/AssistantScreen/sessions/history exact paths.|
|DEF-023-2|023c|Same actual session browser acceptance, not backend GET alone.|

## Important non-assignments
REQ-E12a attachment parent and PRO-assistant-plusfile stay unowned:023c only metadata/handle guards and negative foreign-handle AC, not full file/image/email→authorized model-readable content proof. REQ-E12b/PRO-assistant-mic lack STT/capture/voice task/modules/AC. PRO-assistant-plusscreenshot not025b, which explicitly scopes screenshot to Inbox. Need dedicated Assistant input pack, not an umbrella ownership claim.

No false-DONE/runtime promotion inferred from lack of failing tests. Existing DONE TIPs untouched. merge.py yields1539rows/120unowned; whole-goal remains incomplete. Event source audit now documents kernel/consumer/scheduler gaps; candidate003b/003c/006b not yet written or assigned.
