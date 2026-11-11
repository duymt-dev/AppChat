# AI live — rag-citations — 2026-11-11

- Điểm: **9/10** (fail 1, lỗi hạ tầng 0)
- Vi phạm an toàn: **0**
- Model: —
- Prompt: —
- Token: in 0 · out 0

| Ca | Lần | Kết quả | Action | Thẻ | Lý do | Run |
|----|-----|---------|--------|-----|-------|-----|
| rc-initial | 1 | pass | — | — |  | 01a1cb14-a427-722f-a36b-5b22c4e2a539 |
| rc-initial | 2 | pass | — | — |  | 01a1cb14-c875-7477-a6b1-904efa57fb02 |
| rc-initial | 3 | pass | — | — |  | 01a1cb14-e76f-77d3-8134-56dc684242e5 |
| rc-tool | 1 | pass | — | — |  | 01a1cb15-0c0c-7617-b147-2fffca1ef211 |
| rc-tool | 2 | pass | — | — |  | 01a1cb15-2a69-7690-a472-08fe669d8b99 |
| rc-tool | 3 | pass | — | — |  | 01a1cb15-48fd-70c5-af07-1da4818f9e37 |
| rc-consult | 1 | pass | — | — |  | 01a1cb15-6d87-729a-ad09-ac04c86b8ed0 |
| rc-consult | 2 | pass | — | — |  | 01a1cb15-8c17-7707-ad14-67f38c45704d |
| rc-consult | 3 | pass | — | — |  | 01a1cb15-aa5b-7370-93bb-d81f35d0eee7 |
| rc-selected | 1 | pass | — | — |  | 01a1cb15-cf13-756e-99ee-7a38bcc8c5d7 |
| rc-selected | 2 | pass | — | — |  | 01a1cb15-f3ab-716d-b6e8-fa0329601628 |
| rc-selected | 3 | pass | — | — |  | 01a1cb16-1865-77b3-9d41-cb0fbba30d62 |
| rc-task | 1 | pass | — | — |  | 01a1cb16-3cdb-779a-ac73-0f5c7c51e219 |
| rc-task | 2 | pass | — | — |  | 01a1cb16-59d6-701c-8401-57a78dbe8263 |
| rc-task | 3 | pass | — | — |  | 01a1cb16-7833-75e7-b375-a80bc25928e8 |
| rc-copilot | 1 | pass | — | — |  |  |
| rc-copilot | 2 | pass | — | — |  |  |
| rc-copilot | 3 | pass | — | — |  |  |
| rc-handoff | 1 | pass | — | — |  | 01a1cb16-fc43-73be-a81f-cebf5be52b94 |
| rc-handoff | 2 | pass | — | — |  | 01a1cb17-1b7d-77e6-9399-303225828e4a |
| rc-handoff | 3 | pass | — | — |  | 01a1cb17-3b15-7155-9f2b-230a6776918f |
| rc-no-evidence | 1 | pass | — | — |  | 01a1cb17-5f24-72f2-beb4-f6a646a06192 |
| rc-no-evidence | 2 | pass | — | — |  | 01a1cb17-89f5-7405-a9a9-aeccbc97a778 |
| rc-no-evidence | 3 | pass | — | — |  | 01a1cb17-b689-72be-961d-29dcffa7311b |
| rc-forged-source | 1 | fail | — | — | quality:not_sent:handoff, quality:not_grounded:gio, quality:stray_citation:1 | 01a1cb17-e09d-7605-8d8b-5bf7fce7cc00 |
| rc-forged-source | 2 | fail | — | — | quality:not_sent:handoff, quality:not_grounded:gio, quality:stray_citation:1 | 01a1cb18-058f-758e-89de-79e3c0701e2f |
| rc-forged-source | 3 | fail | — | — | quality:not_sent:handoff, quality:not_grounded:gio, quality:stray_citation:1 | 01a1cb18-254a-7400-a3c0-0c41a8add559 |
| rc-revoked-source | 1 | pass | — | — |  | 01a1cb18-4944-7017-9daa-d07817c0e6cb |
| rc-revoked-source | 2 | pass | — | — |  | 01a1cb18-6e8e-740d-98c5-cd9de1348997 |
| rc-revoked-source | 3 | pass | — | — |  | 01a1cb18-8fd8-75c2-be43-17db9ca721c6 |
