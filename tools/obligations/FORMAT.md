# Định dạng dòng COVERAGE (mọi agent dùng chung)

Một nghĩa vụ = một dòng bảng markdown 6 cột, KHÔNG gộp nhiều nghĩa vụ khác loại vào một dòng:

| ID | Nghĩa vụ | Nguồn | TIP nhận | Trạng thái | Bằng chứng |

- ID: tiền tố theo nhóm + số, vd `REQ-F09`, `D25`, `COM-3.4`, `BP-5.2-a`, `STD-ops-3.5`, `PRO-quotes-export`, `DEF-030-1`. Dùng mã gốc khi có (REQ-xxx, Dxx).
- Nghĩa vụ: ≤ 160 ký tự, cụ thể, đo được ("PDF đề nghị thanh toán có ảnh VietQR", không phải "VietQR").
- Nguồn: `file:dòng` trong coding-packs (vd `plans/COMMERCE-DECISIONS.md:73`).
- TIP nhận: TIP đã làm (001–035) hoặc TIP chờ (023b, 023c, 032b, 030b, 015b, 045b, 036–046) hoặc `—` nếu không ai nhận. Lấy từ 02-TASK-GRAPH.md + tips/*.md (TIP chờ đã có file: 023b, 023c, 032b, 030b, 015b, 045b).
- Trạng thái (một trong):
  - `ĐẠT` — đã có code + test; Bằng chứng BẮT BUỘC có file:dòng code và tên file test.
  - `MỘT PHẦN` — có code nhưng thiếu ý; ghi phần thiếu trong Bằng chứng.
  - `GIẢ` — chỉ chạy nhờ mock / regex / message.info / adapter giả do code (không phải do thiếu tài khoản).
  - `CHỜ-TK` — code xong, chỉ thiếu tài khoản / provider thật (Q-001/003/004/006) — ghi Q.
  - `CHƯA` — chưa có code; TIP nhận phải là TIP chờ, nếu `—` là LỖ HỔNG.
  - `NGOÀI` — loại khỏi phạm vi có mã quyết định (D07, D19, D37, P2/P3 theo ma trận…) — ghi mã ở Bằng chứng.
  - `QUY-TẮC` — luật quy trình / style áp mọi TIP, kiểm bằng lint / CI (ghi lệnh kiểm), không cần TIP riêng.
- Bằng chứng: file:dòng code (packages/…, apps/…) + test (tên file); hoặc lý do. KHÔNG tin trạng thái DONE trong tài liệu — phải grep/đọc code.

Repo: D:\CODING\AppChat_Ver2. Code: packages/{core,actions,shared,ai,channels,integrations,db,ui}, apps/{api,worker,web,widget}. Tài liệu: coding-packs/.
Dữ liệu đã sinh sẵn (dùng, đừng tính lại):
- `tools/obligations/actions.json` — 207 action: id, risk, module, file định nghĩa, handler (file:dòng hoặc null), preview (bool).
- `tools/obligations/routes.json` — route API thật (`api`), đường dẫn FE gọi (`fe`), `missing` = FE gọi mà API không có (chỉ chạy được với mock).
- 51 action có trong Blueprint §3.4 mà registry không có: admin.agent_template.upsert admin.llm_provider.{disable,probe,upsert} admin.model_price.upsert admin.model_route.upsert admin.plan.upsert admin.workspace.{archive,restore,resume,suspend} ai.{detect_intent,extract_info,score_lead,summarize} category.{delete,update} contact.{add_note,bulk_update,forget,remember} contract.{create_appendix,draft_from_content} conversation.{get,search,unhide,untag} insight.query integration.{sync_now,test} kb.folder.{delete,update} kb.suggestion.{approve,reject} message.{unpin,unreact} order.import_external payment.redeem_points product.import product_variant.{archive,create,update} role.{create,delete,update} segment.{create,delete,update} team.{create,set_members,update}

Viết kết quả vào file được giao (tools/obligations/parts/part-<nhóm>.md) (chỉ bảng + tối đa 10 dòng ghi chú cuối). Không sửa file nào khác. Trả lời cuối: số dòng theo từng trạng thái + danh sách ID có Trạng thái CHƯA/GIẢ/MỘT PHẦN mà TIP nhận = `—` (lỗ hổng).
