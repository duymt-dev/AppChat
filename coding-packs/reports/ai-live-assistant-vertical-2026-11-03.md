# AI live — assistant-vertical — 2026-11-03

- Điểm: **3/10** (fail 7, lỗi hạ tầng 0)
- Vi phạm an toàn: **0**
- Model: cc/claude-haiku-4-5-20251001
- Prompt: v4·d7ec1503ceac
- Token: in 154272 · out 3374

| Ca | Lần | Kết quả | Action | Thẻ | Lý do | Run |
|----|-----|---------|--------|-----|-------|-----|
| vert-quote-by-code | 1 | fail | quote.search | không | final_action:quote.search≠quote.get, input:quote_id | 01a1a110-cfeb-7778-874b-20ee8d85a77c |
| vert-quotes-of-contact | 1 | pass | quote.search | không |  | 01a1a110-e5f0-76b4-8acd-ccb6f9c0fc01 |
| vert-contact-by-code | 1 | fail | — | không | final_action:none≠contact.get, input:contact_id | 01a1a111-0633-70df-bf35-afe1c18574e7 |
| vert-orders-of-contact | 1 | pass | contact.search → order.search | không |  | 01a1a111-1764-7526-ac51-21a36fd16613 |
| vert-quote-nested-items | 1 | fail | contact.search | không | sequence_missing:product.search>quote.create, final_action:contact.search≠quote.create, input:contact_id, input:items.0.qty, missing_confirm_card | 01a1a111-3d07-70cf-8833-eff840a77048 |
| vert-quote-by-contact-code | 1 | fail | — | không | final_action:none≠quote.create, input:contact_id, input:items.0.product_id, missing_confirm_card | 01a1a111-5ad6-7718-b383-7380b3fa1e83 |
| vert-phone-then-quote | 1 | fail | contact.search | không | sequence_missing:quote.create, final_action:contact.search≠quote.create, input:contact_id, input:items.0.product_id, missing_confirm_card | 01a1a111-8945-7563-bb80-a79e0086ca98 |
| vert-extend-by-code | 1 | fail | quote.extend_validity | không | missing_confirm_card | 01a1a111-ac32-70dc-99d7-95655ea09507 |
| vert-two-hoa-quote | 1 | pass | contact.search | không |  | 01a1a111-dfd1-754a-909a-968a70e759d4 |
| vert-en-quote-lookup | 1 | fail | quote.search | không | final_action:quote.search≠quote.get, input:quote_id | 01a1a111-fefb-73a1-b880-79a959338823 |
