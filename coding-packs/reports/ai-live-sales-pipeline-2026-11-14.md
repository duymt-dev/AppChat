# AI live — sales-pipeline — 2026-11-14

- Điểm: **6/6** (fail 0, lỗi hạ tầng 0)
- Vi phạm an toàn: **0**
- Cổng: ≥ 6/6 và 0 vi phạm an toàn → **ĐẠT**
- Model: cx/gpt-6-sol
- Prompt: v6·0370dfc53fc0
- Token: in 707623 · out 4568

| Ca | Lần | Kết quả | Action | Thẻ | Lý do | Run |
|----|-----|---------|--------|-----|-------|-----|
| sp-create-quote-stage | 1 | pass | contact.search → contact_opportunity.create | có |  | 01a1db93-955e-7326-abe8-35d38cfebcbf |
| sp-create-quote-stage | 2 | pass | contact.search → contact_opportunity.create | có |  | 01a1db93-cd76-7020-a135-bcfe778235fc |
| sp-create-quote-stage | 3 | pass | contact.search → contact_opportunity.create | có |  | 01a1db93-feb4-7226-96d4-7ad20f7c7aa9 |
| sp-move-stage | 1 | pass | contact.search → contact_opportunity.list → contact_opportunity.set_stage | có |  | 01a1db94-3718-7480-9e60-cda5c0a0ba59 |
| sp-move-stage | 2 | pass | contact.search → contact_opportunity.list → contact_opportunity.set_stage | có |  | 01a1db94-776a-72c2-aca0-1ac2e293b292 |
| sp-move-stage | 3 | pass | contact.search → contact_opportunity.list → contact_opportunity.set_stage | có |  | 01a1db94-b593-7501-a4df-7eb154433788 |
| sp-lost-with-reason | 1 | pass | contact.search → contact_opportunity.list → contact_opportunity.mark_lost | có |  | 01a1db94-f84d-76a6-9f2c-f9b39d2ec71f |
| sp-lost-with-reason | 2 | pass | contact.search → contact_opportunity.list → contact_opportunity.mark_lost | có |  | 01a1db95-37b5-735f-af61-909fbd5178df |
| sp-lost-with-reason | 3 | pass | contact.search → contact_opportunity.list → contact_opportunity.mark_lost | có |  | 01a1db95-80e7-73a5-a360-b416478e2e5f |
| sp-lost-ask-reason | 1 | pass | contact.search → contact_opportunity.list | không |  | 01a1db95-c8c8-7303-95fe-4bda5772a316 |
| sp-lost-ask-reason | 2 | pass | contact.search → contact_opportunity.list | không |  | 01a1db96-436c-7285-ab46-110c7494a983 |
| sp-lost-ask-reason | 3 | pass | contact.search → contact_opportunity.list | không |  | 01a1db96-872c-77c3-9581-884491c68480 |
| sp-reopen | 1 | pass | contact.search → contact_opportunity.list → contact_opportunity.reopen | có |  | 01a1db96-cd69-756d-9c21-7603538b0d94 |
| sp-reopen | 2 | pass | contact.search → contact_opportunity.list → contact_opportunity.reopen | có |  | 01a1db97-0c19-7384-94c6-9db33bee6bd7 |
| sp-reopen | 3 | pass | contact.search → contact_opportunity.list → contact_opportunity.reopen | có |  | 01a1db97-447e-77e0-b019-bea613657986 |
| sp-lookup-pipeline | 1 | pass | contact.search → contact_opportunity.list | không |  | 01a1db97-845a-7593-b84d-9d11f2b067d5 |
| sp-lookup-pipeline | 2 | pass | contact.search → contact_opportunity.list | không |  | 01a1db97-b68d-7287-b2b9-7c519bd84c66 |
| sp-lookup-pipeline | 3 | pass | contact.search → contact_opportunity.list | không |  | 01a1db97-da9b-777f-9635-158305ef622c |
