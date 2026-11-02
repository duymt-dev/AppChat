# Agent channel behavior planning audit — 2026-11-02

Docs only; no source implementation/native service/provider calls.

## Evidence

- agent.runtime.ts:43–53 custom always true, office fixed UTC+7; channel hours only prompt context. Agent config/version stored mode only.
- reply.service selects existing/default agent, ignores structured intent, drops explicit handoff summary on some paths. reply.rules only notify/realtime; complaint ticket requires separate authorized action consumer.
- Sales/Booking template defaults lack requested tools; seed is insert-missing only, so changing constants alone cannot migrate template catalog safely.
- reply-context carries nontext placeholder, not actual attachment extraction. Explicit readable/unreadable metadata is required to prevent false file-reading claims.
- A new greeting before ordinary answer would make current last-message-direction eligibility skip that answer after restart. Durable pending source/phase and shared writer purpose are necessary, including FRT/draft protection.

## TIP022b

115 exact paths,19 bilateral shared-file declarations; typed schedules, opt-in account keyword routing/greeting, intent CAS, every-path scoped handoff summary, one complaint ticket through current agent permission, versioned default tools and typed attachment context.13 owned obligations;11 previously unowned assigned, one new attachment row. REQ-M02a downgraded from overly broad ĐẠT to MỘT PHẦN based on custom-hours code. DC249 records safe explicit migration, not new permission/commerce rules.

Independent reviewer found missing settings-apps mock/DTO wiring and greeting crash-recovery contract. Both patched, with outbound purpose/action context/shared writer manifest additions. Recheck confirmed no remaining blocker in this local review. Not whole-goal PASS.

## Validation / next work

Before commit: exact path existence/uniqueness, bilateral intersections, owned IDs/sections and git diff whitespace checks. No runtime commands reported as run; all TIP test commands are future acceptance gates.

Ledger1482 rows/**196 owner gaps**. Whole-goal remainder still includes025b Inbox,019b runtime,012b providers, other supplemental domains,044/045/046 and seven-part/full-graph independent review. Continue work after this checkpoint; no completion claim.
