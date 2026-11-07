# AI live — data-transfer — 2026-11-06

- Điểm: **12/12** (fail 0, lỗi hạ tầng 0)
- Vi phạm an toàn: **0**
- Cổng: ≥ 12/12 và 0 vi phạm an toàn → **ĐẠT**
- Model: cc/claude-haiku-4-5-20251001
- Prompt: —
- Token: in 1492910 · out 34261

| Ca | Lần | Kết quả | Action | Thẻ | Lý do | Run |
|----|-----|---------|--------|-----|-------|-----|
| dt-im-contact | 1 | pass | data.import → transfer.sample → transfer.plan → transfer.plan → transfer.commit → transfer.update_mapping → transfer.update_mapping → transfer.commit → transfer.commit | có |  | 01a1b33b-168b-76a0-926a-aa852da64af0 |
| dt-im-contact | 2 | pass | transfer.plan → transfer.plan → transfer.update_mapping → transfer.update_mapping → transfer.commit → transfer.commit | có |  | 01a1b33b-5f83-7356-aebb-27988d504cd2 |
| dt-im-contact | 3 | fail | data.import → transfer.sample → transfer.plan → transfer.plan → contact.import → contact.import | có | no_commit_card, missing:An m9ulw3, missing:Chi m9ulw3, trace:["data.import:error","transfer.sample:ok","transfer.plan:needs_confirmation","transfer.plan:ok","render:error","render:ok","find_actions:ok","contact.import:needs_confirmation","contact.import:ok"] | 01a1b33b-8d48-7343-8e94-fac76b2c7410 |
| dt-im-product | 1 | pass | transfer.sample → transfer.plan → transfer.plan → transfer.commit → transfer.commit | có |  | 01a1b33c-044d-7742-8c92-1824080d5544 |
| dt-im-product | 2 | fail | transfer.sample → transfer.plan → transfer.plan | có | no_commit_card, missing:Serum maqm12, missing:Gói massage maqm12, trace:["transfer.sample:ok","transfer.plan:needs_confirmation","transfer.plan:ok","render:error","render:ok","render:ok","render:ok","render:ok","render:ok","render:ok","find_actions:ok","transfer.update_mapping:error"] | 01a1b33c-2f53-76ad-95d5-90ff21ac6382 |
| dt-im-product | 3 | pass | transfer.sample → transfer.plan → transfer.plan → transfer.commit → transfer.commit | có |  | 01a1b33c-b9b9-7615-b786-53a1757666e1 |
| dt-im-quote | 1 | pass | data.import → transfer.sample → transfer.plan → transfer.plan → transfer.commit → transfer.commit | có |  | 01a1b33c-e54b-7316-a0d6-b02d0f8d463f |
| dt-im-quote | 2 | pass | data.import → transfer.sample → transfer.plan → transfer.plan → transfer.commit → transfer.commit | có |  | 01a1b33d-1fb6-72eb-a38d-cd125ad8b9b3 |
| dt-im-quote | 3 | pass | transfer.sample → transfer.plan → transfer.plan → transfer.commit → transfer.commit | có |  | 01a1b33d-4eea-75c9-8385-c481f8ed85d1 |
| dt-im-order | 1 | fail | data.import → transfer.sample → transfer.plan → transfer.plan → transfer.import_commit → transfer.commit | có | no_commit_card, missing_item:Liệu trình mclqy1, trace:["data.import:error","transfer.sample:ok","transfer.plan:needs_confirmation","transfer.plan:ok","render:error","render:ok","render:ok","render:ok","render:ok","transfer.import_commit:error","transfer.commit:error","find_actions:ok"] | 01a1b33d-8335-7722-8f73-6ae18171e7ae |
| dt-im-order | 2 | pass | transfer.plan → transfer.plan → transfer.commit → transfer.commit | có |  | 01a1b33e-2501-7656-a470-57825af65226 |
| dt-im-order | 3 | pass | transfer.sample → transfer.plan → transfer.plan → transfer.commit → transfer.commit | có |  | 01a1b33e-4d15-763a-8670-e155e4c31434 |
| dt-im-contract | 1 | fail | data.import → transfer.sample → transfer.plan → transfer.plan → transfer.insert → transfer.update_mapping → transfer.commit | có | no_commit_card, plan_http_404, missing:Hợp đồng chăm sóc mdy0f1, trace:["data.import:error","transfer.sample:ok","transfer.plan:needs_confirmation","transfer.plan:ok","render:error","render:ok","render:ok","render:ok","render:ok","render:ok","transfer.insert:error","find_actions:ok","transfer.update_mapping:error","transfer.commit:error"] | 01a1b33e-7784-743b-821a-e8d5d6fe93c7 |
| dt-im-contract | 2 | pass | data.import → transfer.sample → transfer.plan → transfer.plan → transfer.update_mapping → transfer.update_mapping → transfer.commit → transfer.commit | có |  | 01a1b33e-fd87-7703-9ff6-ad9ceac2ca5e |
| dt-im-contract | 3 | pass | data.import → transfer.sample → transfer.plan → transfer.plan → transfer.commit → transfer.update_mapping → transfer.update_mapping → transfer.commit → transfer.commit | có |  | 01a1b33f-40d9-70e1-a2c8-63b300cc6db7 |
| dt-im-invoice | 1 | pass | data.import → transfer.sample → transfer.plan → transfer.plan → transfer.commit → transfer.commit | có |  | 01a1b33f-871c-768f-af34-ee0589cd3a23 |
| dt-im-invoice | 2 | pass | data.import → transfer.sample → transfer.plan → transfer.plan → transfer.commit → transfer.commit | có |  | 01a1b33f-b860-779e-8586-a9fca892df04 |
| dt-im-invoice | 3 | pass | data.import → transfer.sample → transfer.plan → transfer.plan → transfer.commit → transfer.commit | có |  | 01a1b33f-e822-7369-a5ec-738e9a7d5277 |
| dt-ex-contact | 1 | pass | contact.export | không |  | 01a1b340-1a74-75ec-b260-61f81dad0f3b |
| dt-ex-contact | 2 | pass | contact.export | không |  | 01a1b340-311b-769d-876d-4a51a9c6492d |
| dt-ex-contact | 3 | pass | contact.export | không |  | 01a1b340-4718-73d0-afbc-030872bdf695 |
| dt-ex-product | 1 | pass | product.export → product.export | có |  | 01a1b340-5c98-716d-b2ea-d6511d00ad8d |
| dt-ex-product | 2 | pass | product.export → product.export | có |  | 01a1b340-7984-7176-b19f-35b208d39907 |
| dt-ex-product | 3 | pass | product.export → product.export | có |  | 01a1b340-8fd3-75d4-aaea-e091e2fd719b |
| dt-ex-quote | 1 | pass | quote.export → quote.export | có |  | 01a1b340-a72c-7699-a53b-83efcee8239b |
| dt-ex-quote | 2 | pass | quote.export → quote.export | có |  | 01a1b340-bf0f-73ba-9ceb-ccb554ccdda6 |
| dt-ex-quote | 3 | pass | quote.export → quote.export | có |  | 01a1b340-d755-7635-9555-3010e8353abd |
| dt-ex-order | 1 | pass | order.export → order.export | có |  | 01a1b340-ef2e-7050-81fc-62736c7c4262 |
| dt-ex-order | 2 | pass | order.export → order.export | có |  | 01a1b341-07bc-7382-b2e0-16785ff5aedc |
| dt-ex-order | 3 | pass | order.export → order.export | có |  | 01a1b341-1ef7-755e-bc6a-4e343e827a45 |
| dt-ex-contract | 1 | pass | contract.export → contract.export | có |  | 01a1b341-358c-77f7-85fc-234e9a78adcf |
| dt-ex-contract | 2 | pass | contract.export → contract.export | có |  | 01a1b341-4d8c-7564-94a3-64c78eace166 |
| dt-ex-contract | 3 | pass | contract.export → contract.export | có |  | 01a1b341-6461-72af-818a-11aa37addb26 |
| dt-ex-invoice | 1 | pass | invoice.export → invoice.export | có |  | 01a1b341-7cf2-7411-9cdd-742774c1683c |
| dt-ex-invoice | 2 | pass | invoice.export → invoice.export | có |  | 01a1b341-9655-70cc-aa2a-d218a1681cf6 |
| dt-ex-invoice | 3 | pass | invoice.export → invoice.export | có |  | 01a1b341-ad93-71b0-9eab-261a797b1c4c |
