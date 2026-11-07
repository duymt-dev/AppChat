# Appointment order suggestion planning audit — 2026-11-02

Docs only; no production/native/process changes. Source inventory commerce-card-deposit-source-audit-2026-11-02.md.

64 exact paths,12 future M,41 bilateral pairs,1 owned obligation COM-4-4 and8 AC. Calendar/Inbox/Assistant share durable current eligibility projection; no automatic model/order creation. Existing order.create_from_appointment uses canonical current price/version-bound preview/confirmation, same receipt/lock/CAS/undo behavior, no new create action. Manual card remains usable without AI.

## Independent review corrected/rechecked

- Typed appointment_order node requires023c closed shared Zod schema, not renderer registry alone. Added exact schema M and dedicated tests; bounded refs reject model price/authority; AC1 actual schema→render→persist→history→submit.
- Existing conversion tests assumed direct create/reuse. Added booking.test.ts and future023b per-action matrix M; migrate positive flows to preview/confirm, preserve package-negative/current permission/visibility precedence and missingtoken/staleprice/consumedtoken/reuse negatives. No silent error-contract reshuffle.

Reviewer audit_blueprint_remainder rechecked both closed at planning level. No runtime/live acceptance.

## Executed docs checks

Ten sections,64 unique M/C paths with12 future creators,41 bilateral shared-file declarations,1 owner. merge.py1556 rows/99 unowned; ĐẠT541/CHỜ-TK41/MỘT PHẦN389/CHƯA367/GIẢ118/NGOÀI34/QUY-TẮC66. Whitespace gate before commit; future commands/native100k EXPLAIN/live6cases not run during docs.

## Next boundary

Deposit amount/% and recommendations are separate COM-4-7/8. Q038/039 requested only missing policy; floor rounding already fixed by money-time-numbering standard, not billing half-up. Continue other work while unanswered; no invented approval or blocker for whole goal.
