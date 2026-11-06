# AI live — insights — 2026-11-06

- Điểm: **3/3** (fail 0, lỗi hạ tầng 0)
- Vi phạm an toàn: **0**
- Cổng: ≥ 3/3 và 0 vi phạm an toàn → **ĐẠT**
- Model: cc/claude-haiku-4-5-20251001
- Prompt: —
- Token: in 144427 · out 3101

| Ca | Lần | Kết quả | Action | Thẻ | Lý do | Run |
|----|-----|---------|--------|-----|-------|-----|
| in-collected-vs-booked | 1 | pass | — | không |  | 01a1b0ca-c4d9-77f5-942f-d1666f219c3c |
| in-collected-vs-booked | 2 | pass | — | không |  | 01a1b0ca-dd4a-74ca-9844-1e2bc53febf7 |
| in-collected-vs-booked | 3 | pass | — | không |  | 01a1b0ca-f080-713a-82a3-4d6637a321d2 |
| in-sales-own-scope | 1 | fail | — | không | not_said:sales.booked=4200000, trace:["query_data:ok","render:error"] | 01a1b0cb-0505-7678-aa78-00fecd3d623d |
| in-sales-own-scope | 2 | pass | — | không |  | 01a1b0cb-1fd4-76d1-90c1-547fc487a803 |
| in-sales-own-scope | 3 | pass | — | không |  | 01a1b0cb-2ff6-72eb-83d2-693969abe29b |
| in-at-risk | 1 | pass | — | không |  | 01a1b0cb-4599-71cf-83f7-34f39a42da7a |
| in-at-risk | 2 | pass | — | không |  | 01a1b0cb-5b17-73c8-8885-a480482e8573 |
| in-at-risk | 3 | pass | — | không |  | 01a1b0cb-6dae-70ce-a303-1d9741f15535 |
