# AppChat — Requirements Matrix (RRI Report)

> Vibecode Kit v5.0 — BƯỚC 2 (RRI) Output
> Date: 2026-10-28
> Upstream: `00-PROJECT-CONTEXT.md` (scan 2026-10-27), `product/*`

---

## 0. Định hướng sản phẩm (chốt với Chủ nhà)

- **Mô hình OPC (One-Person Company):** một chủ doanh nghiệp vận hành toàn bộ công việc cùng **đội AI Agents**. Thành viên là người thật thì không bắt buộc.
- **Lõi sản phẩm:** **Trợ lý AI đóng vai agent bán hàng**, theo cơ chế *một bộ não, hai mặt*:
  - **Mặt ngoài:** trực kênh, tự tư vấn và bán cho khách qua Zalo cá nhân, Web chat, Email.
  - **Mặt trong:** chủ DN ra lệnh và hỏi agent qua màn Trợ lý AI.
  - Hai mặt dùng chung tools, dữ liệu và trí nhớ.
- **Vai trò các màn còn lại** (CRM, Lịch hẹn, Ticket, Marketing, Loyalty, Báo cáo…): chủ yếu **hiển thị và quản lý những việc agent làm được**, cộng thao tác cơ bản cho người.
- **Mục tiêu:** sản phẩm thương mại, bán được ngay. Không làm bản "MVP".
- **Kênh bắt buộc:** **Zalo cá nhân** (đăng nhập bằng QR, thư viện không chính thức; chấp nhận rủi ro), **Web Live Chat widget**, **Email**.
- **Chưa làm:** Call Center, Workflow engine.

---

## REQUIREMENTS MATRIX

Ưu tiên: **P0** = phải có để bán được · **P1** = cần có khi phát hành · **P2** = sau phát hành · **P3** = backlog.

### Domain A — Identity, Workspace & Trial (OPC)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-A01 | Đăng ký / đăng nhập bằng OTP. Cần chốt kênh gửi OTP: Zalo hay Email (xem OQ-02). Có thêm Email + mật khẩu, "Ghi nhớ 30 ngày", quên mật khẩu (link 15 phút, chống dò tài khoản). | P0 | Chủ DN | TBD |
| REQ-A02 | Popup khai báo bắt buộc, không đóng được. Doanh nghiệp/Hộ KD: tra cứu MST rồi tự điền thông tin. Cá nhân: nhập VNeID và nhập tay. Sau đó chọn lĩnh vực kinh doanh (taxonomy ngành 2 cấp, 10 nhóm). | P0 | Chủ DN | TBD |
| REQ-A03 | Workspace là tenant; mọi bảng nghiệp vụ có `workspace_id` và **PostgreSQL RLS**; có test tự động chống rò rỉ dữ liệu giữa các tenant. | P0 | — | TBD |
| REQ-A04 | Một user thuộc được nhiều workspace (membership N–N), chuyển workspace ngay từ menu Hồ sơ. | P1 | Chủ DN | TBD |
| REQ-A05 | RBAC đơn giản: **Owner + Member**. Owner có toàn quyền gồm billing; Member xử lý hội thoại và dữ liệu, không vào billing hay cài đặt hệ thống. Mời thành viên bằng email hoặc SĐT. | P0 | Chủ DN | TBD |
| REQ-A06 | Trial 15 ngày gói Cá nhân Pro, kèm 10.000 credit; có màn chào mừng (2 nút) và badge "Còn X ngày". Hết hạn thì hạ về gói Miễn phí; thông báo đóng được; dữ liệu giữ nguyên. | P0 | Chủ DN | TBD |
| REQ-A07 | Audit log cho mọi hành động quản trị, của người và của AI. | P1 | — | TBD |
| REQ-A08 | Đăng nhập social (Google / Facebook…). | P2 | Chủ DN | TBD |

### Domain B — Kênh (Channel Gateway)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-B01 | Kiến trúc adapter kênh: mỗi adapter nhận và gửi tin, chuẩn hoá về schema chung. Chống xử lý trùng tin bằng `UNIQUE(channel_account_id, channel_msg_id)`. Gửi đi qua outbox, retry back-off, dead-letter. | P0 | — | TBD |
| REQ-B02 | **Zalo cá nhân:** kết nối bằng quét QR. Duy trì phiên (lưu credential đã mã hoá, tự kết nối lại). Nhận và gửi tin 1-1 (text, ảnh, file, sticker). Đồng bộ danh bạ và tin gần đây. Báo trạng thái kênh (đang kết nối / lỗi / hết phiên). | P0 | Chủ DN | TBD |
| REQ-B03 | Zalo cá nhân — **hội thoại nhóm**: nhận tin nhóm. AI trong nhóm có 3 chế độ: chỉ trả lời khi được @, tự động, hoặc tắt. | P1 | Chủ DN | TBD |
| REQ-B04 | Zalo cá nhân — **an toàn tài khoản:** cảnh báo rủi ro khi kết nối; giới hạn tốc độ gửi giống người thật (random delay, quota/ngày); tự ngắt khi phát hiện bị chặn. | P0 | Chủ DN | TBD |
| REQ-B05 | **Web Live Chat widget:** đoạn mã JS nhúng; tuỳ chỉnh màu, logo, lời chào; form thu lead; chọn AI Agent trực; realtime. | P0 | Khách cuối | TBD |
| REQ-B06 | **Email:** kết nối qua IMAP (nhận) + SMTP (gửi) hoặc Gmail OAuth; gom email theo thread thành hội thoại. | P1 | Chủ DN | TBD |
| REQ-B07 | Trang **Kênh kết nối** trong Cài đặt: danh sách kênh, trạng thái sức khoẻ, kết nối lại, ngắt kết nối. | P0 | Chủ DN | TBD |
| REQ-B08 | Zalo OA / ZNS, Facebook Messenger, Instagram, Telegram, WhatsApp, TikTok. | P2 | — | TBD |

### Domain C — Hộp thư (Inbox)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-C01 | Inbox hợp nhất 3 cột: danh sách hội thoại · khung chat · Hồ sơ 360°. Realtime qua WebSocket; tin nhắn hiển thị p95 < 1s. | P0 | Chủ DN / Member | TBD |
| REQ-C02 | Mỗi hội thoại có **chế độ AI**: `off` / `copilot` (gợi ý, người gửi) / `auto` (agent tự trả lời). Có mặc định theo kênh. | P0 | Chủ DN | TBD |
| REQ-C03 | Folder views: Tất cả · Của tôi · **AI đang xử lý** · **Cần người** (AI đã handoff) · **AI chờ duyệt** · Chưa đọc · theo kênh. | P0 | Chủ DN | TBD |
| REQ-C04 | Gán hội thoại cho người hoặc AI Agent; gắn thẻ (nguồn thẻ dùng chung); ghi chú nội bộ có @mention; ghim; lưu trữ. | P0 | Member | TBD |
| REQ-C05 | Composer: đính kèm file, câu trả lời mẫu, AI soạn / viết lại / dịch; nhãn ý định (MUA / HỎI / KHIẾU NẠI / ĐẶT LỊCH). | P1 | Member | TBD |
| REQ-C06 | Hội thoại tự gắn với Khách hàng: khớp theo SĐT / email / ID kênh; chưa có thì tạo hồ sơ nháp; khớp không chắc thì gợi ý gộp. | P0 | — | TBD |
| REQ-C07 | Thao tác "Chuyển thành": Đơn · Báo giá · Lịch hẹn · Ticket, ngay từ hội thoại. | P1 | Member | TBD |
| REQ-C08 | Multi-select và thao tác hàng loạt (gắn thẻ, gán, lưu trữ); tìm kiếm tiếng Việt không dấu. | P1 | Member | TBD |

### Domain D — AI Sales Agent (lõi)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-D01 | **Agent runtime** chạy sau một interface **Agent Gateway** để có thể thay động cơ (xem OQ-01). Agent loop gồm: nhận ngữ cảnh → RAG → gọi tools → trả lời. Tin nhắn vào được xử lý bất đồng bộ trong worker, stream kết quả. | P0 | — | TBD |
| REQ-D02 | **LLM Router đa nhà cung cấp** (Claude / GPT / Gemini / DeepSeek). Định tuyến theo tác vụ, gói và chi phí; có fallback khi nhà cung cấp lỗi. Ẩn tên model với khách (chỉ hiện "AI tiêu chuẩn / nâng cao"). | P0 | — | TBD |
| REQ-D03 | **Bộ tools bán hàng:** tra cứu sản phẩm / giá / tồn kho; tạo và cập nhật khách hàng; tạo báo giá; tạo đơn; đặt / dời / huỷ lịch hẹn (có kiểm tra trùng); tạo ticket; gắn thẻ; gửi file / ảnh sản phẩm; chuyển người. | P0 | — | TBD |
| REQ-D04 | **Knowledge base (RAG):** tải lên PDF / DOCX / XLSX / TXT / URL; dùng pgvector; trả lời kèm trích nguồn. Danh mục sản phẩm cũng là nguồn tri thức. | P0 | Chủ DN | TBD |
| REQ-D05 | **Ranh giới tự chủ (theo spec):** agent tự trả lời, tạo / cập nhật khách, đặt lịch, tạo báo giá và đơn theo bảng giá khi **độ tin cậy ≥ 70%**. **Bắt buộc người duyệt** khi: giảm giá ngoài chính sách, hoàn tiền, báo giá vượt ngưỡng (cấu hình được, mặc định 20 triệu), hợp đồng, gửi hàng loạt. | P0 | Chủ DN | TBD |
| REQ-D06 | **Handoff sang người** khi: độ tin cậy thấp, khách đòi gặp người, khách hỏi lặp lại 3 lần, cảm xúc tiêu cực hoặc khiếu nại, ngoài phạm vi. Kèm tóm tắt và bản nháp; hội thoại chuyển sang folder "Cần người". | P0 | — | TBD |
| REQ-D07 | **Hàng chờ duyệt:** thẻ Duyệt / Sửa / Từ chối cho các hành động cần người, hiện ở Inbox, Tổng quan và thông báo. | P0 | Chủ DN | TBD |
| REQ-D08 | **Nhật ký hành động AI:** ghi mọi lần chạy (prompt, nguồn tri thức, tools đã gọi, token, credit); **hoàn tác được** với nhóm hành động cho phép. | P0 | Chủ DN | TBD |
| REQ-D09 | **Builder AI Agent:** tên, vai trò, tính cách / giọng điệu, system prompt, kênh phụ trách, tools được phép, ngưỡng tin cậy, giờ trực; có panel chat thử trực tiếp. Thư viện mẫu theo ngành. | P0 | Chủ DN | TBD |
| REQ-D10 | **Trí nhớ khách hàng:** agent đọc Hồ sơ 360° (lịch sử mua, lịch hẹn, ghi chú, hạng loyalty) trước khi trả lời và ghi lại sự kiện quan trọng. | P0 | — | TBD |
| REQ-D11 | Lọc PII trước khi đưa vào prompt (CMND, số thẻ, số tài khoản); có guardrail và danh sách từ cấm. | P1 | — | TBD |
| REQ-D12 | **Chủ động (Hands):** follow-up khách im lặng, nhắc lịch hẹn, chăm sóc sau mua, hỏi lại báo giá đang treo. Chạy theo lịch, phải tôn trọng giới hạn gửi của Zalo cá nhân. | P1 | — | TBD |
| REQ-D13 | Nhiều agent chuyên trách (Sales / CSKH / Booking) có điều phối và chuyển việc cho nhau (A2A). | P2 | — | TBD |
| REQ-D14 | Hiệu suất agent: số hội thoại, tỉ lệ tự xử lý, tỉ lệ chốt, CSAT, credit đã dùng; đo ngang hàng với nhân sự. | P1 | Chủ DN | TBD |

### Domain E — Trợ lý AI (mặt trong — chủ DN ra lệnh)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-E01 | Màn Trợ lý AI: ô lệnh lớn, gợi ý theo ngữ cảnh, câu trả lời stream, **thẻ hành động deep-link** tới kết quả. Dùng chung "bộ não" và tools với agent bán hàng. | P0 | Chủ DN | TBD |
| REQ-E02 | Ra lệnh nghiệp vụ, ví dụ: "hôm nay có gì cần tôi", "tóm tắt khách X", "tạo báo giá cho…", "nhắc tất cả khách có lịch mai", "doanh số tuần này". Mọi thao tác ghi hoặc gửi đều phải **hỏi xác nhận** trước khi chạy (BR-05). | P0 | Chủ DN | TBD |
| REQ-E03 | Lưu "Nội dung trò chuyện" (danh sách phiên, tìm kiếm); Nhật ký hành động có lọc và hoàn tác. | P1 | Chủ DN | TBD |
| REQ-E04 | Hai tab **Chat** (tư duy, không thay đổi dữ liệu) và **Cowork** (thực thi qua agent). | P1 | Chủ DN | TBD |
| REQ-E05 | Bản thu nhỏ "Trợ lý AI · [module]" nhúng trong từng module, tự nạp ngữ cảnh bản ghi đang xem. | P2 | Chủ DN | TBD |
| REQ-E06 | Cấu hình hệ thống bằng hội thoại (tạo agent, thẻ, mẫu trả lời…). | P2 | Chủ DN | TBD |

### Domain F — Khách hàng & Bán hàng (CRM)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-F01 | **Khách hàng:** danh sách (bảng với cột tuỳ biến, lọc, tìm không dấu) và kanban theo giai đoạn (Lead mới → Tiềm năng → Đang tư vấn → Báo giá → Đã mua). Cột "AI gợi ý" kèm nút "Giao AI". | P0 | Chủ DN | TBD |
| REQ-F02 | **Hồ sơ 360°:** tóm tắt AI, thông tin, timeline đa kênh, đơn / báo giá / lịch hẹn / ticket, ghi chú, hạng loyalty. | P0 | Chủ DN | TBD |
| REQ-F03 | Check trùng và gộp hồ sơ (SĐT / email / ID kênh / MST); import và export Excel. | P1 | Chủ DN | TBD |
| REQ-F04 | **Custom fields** theo workspace và ngành (Text, Number, Currency, Date, Phone, Email, Picklist, Lookup, File), tự áp vào bảng, form, bộ lọc và chi tiết. | P1 | Chủ DN | TBD |
| REQ-F05 | **Sản phẩm & Dịch vụ:** các loại vật lý / dịch vụ / combo / thẻ-liệu trình; giá, giá vốn, đơn vị tính, thuế, tồn kho, ảnh, danh mục. **Agent dùng làm nguồn tư vấn và báo giá.** | P0 | Chủ DN | TBD |
| REQ-F06 | **Báo giá:** do agent hoặc người tạo; mặc định hết hạn sau 15 ngày; versioning n+1 khi bị yêu cầu sửa hoặc từ chối; trạng thái chờ / đã chấp nhận / yêu cầu sửa / từ chối / hết hạn; gửi khách qua kênh hội thoại (PDF hoặc ảnh). | P0 | Chủ DN / Agent | TBD |
| REQ-F07 | **Đơn hàng:** tạo từ báo giá hoặc trực tiếp; trạng thái new → confirmed → (shipping) → done / cancelled; trạng thái thanh toán; hoàn tất đơn phát event `order.completed`. | P0 | Chủ DN / Agent | TBD |
| REQ-F08 | **Hoá đơn và thu tiền:** hoá đơn từ đơn hàng; gửi QR thanh toán VietQR cho khách cuối; trạng thái Nháp / Đã gửi / Đã thanh toán / Quá hạn; công nợ. | P1 | Chủ DN | TBD |
| REQ-F09 | Hợp đồng (từ báo giá thắng, duyệt, ký). | P2 | Chủ DN | TBD |
| REQ-F10 | Pipeline tự cập nhật giai đoạn khách theo luồng báo giá → đơn → hoá đơn (BR-09). | P0 | — | TBD |

### Domain G — Lịch hẹn
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-G01 | Lịch xem theo ngày / tuần / tháng / danh sách; dịch vụ (thời lượng, giá, thời gian đệm); nhân sự hoặc tài nguyên phụ trách; giờ mở cửa. | P0 | Chủ DN | TBD |
| REQ-G02 | Trạng thái lịch (bản rút gọn từ spec): Chờ xác nhận (giữ chỗ 2 giờ) → Đã xác nhận → Hoàn tất / Khách không đến (ân hạn 20 phút) / Đã dời / Đã huỷ (bắt buộc lý do). | P0 | — | TBD |
| REQ-G03 | **Chống trùng lịch** theo nhân sự (P0) và theo phòng / thiết bị (P2); agent gợi ý slot trống gần nhất. | P0 | Agent | TBD |
| REQ-G04 | Nhắc hẹn trước 24 giờ và 2 giờ qua kênh khách đã dùng; khách trả lời "đổi" hoặc "huỷ" thì agent xử lý. | P1 | Agent | TBD |
| REQ-G05 | Bắt buộc gắn lịch với Khách hàng trong CRM. | P0 | — | TBD |
| REQ-G06 | Danh sách chờ, lịch lặp / liệu trình, dự báo no-show, đặt cọc. | P2 | — | TBD |

### Domain H — Hỗ trợ (Ticket) & SLA
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-H01 | Ticket: trạng thái Đang mở → Đang xử lý → Đang chờ (dừng SLA) → Đã đóng (có lý do) → mở lại; ưu tiên Cao / TB / Thấp; danh mục; người phụ trách (người hoặc AI). | P1 | Chủ DN | TBD |
| REQ-H02 | Agent tự tạo ticket khi phát hiện khiếu nại hoặc sự cố; chống trùng (cùng khách và danh mục trong 24 giờ thì hỏi gộp). | P1 | Agent | TBD |
| REQ-H03 | SLA: chính sách mặc định không xoá được (FRT người ≤10 phút, TTR ≤4 giờ trong giờ làm); đồng hồ 3 màu; leo thang khi quá hạn (nhắc Owner). Chỉ áp cho việc mới. | P1 | — | TBD |
| REQ-H04 | Danh sách và Kanban 4 cột; KPI (đang mở / đang chờ / quá hạn / đã đóng); CSAT khi đóng. | P1 | Chủ DN | TBD |
| REQ-H05 | Nhiều chính sách SLA theo kênh / hạng khách; leo thang 4 cấp theo sơ đồ tổ chức. | P3 | — | TBD |

### Domain I — Marketing broadcast
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-I01 | Phân khúc động từ CRM (thẻ / giai đoạn / hành vi / giá trị / lần mua cuối). | P1 | Chủ DN | TBD |
| REQ-I02 | **AI đề xuất chiến dịch** từ dữ liệu CDP. Có 4 loại: tái kích hoạt (>90 ngày), bán thêm, chuyển đổi (báo giá treo), chăm sóc sau mua. AI soạn sẵn nội dung có biến cá nhân hoá. Luôn có lối "Tạo thủ công". | P1 | Chủ DN | TBD |
| REQ-I03 | Gửi qua **Zalo cá nhân** (throttle chặt, giới hạn/ngày, random delay) và **Email**; loại trừ người đã huỷ nhận tin và người vừa nhận chiến dịch khác trong 48 giờ. | P1 | — | TBD |
| REQ-I04 | **Không chiến dịch nào tự gửi**: bắt buộc Owner duyệt; đã duyệt thì chỉ được tạm dừng hoặc xoá (BR-02). Dự toán credit so với số dư ví. | P1 | Chủ DN | TBD |
| REQ-I05 | Báo cáo chiến dịch: gửi / nhận / phản hồi / chuyển đổi; khách phản hồi thì thành hội thoại trong Inbox. | P1 | Chủ DN | TBD |
| REQ-I06 | A/B test, ZNS / SMS, Template Studio kéo-thả. | P2 | — | TBD |

### Domain J — Khách hàng thân thiết (Loyalty)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-J01 | Hạng thành viên (mặc định Thành viên 0 / Bạc 5.000 / Vàng 15.000 / Kim cương 40.000 điểm; cấu hình được); sổ cái điểm (point ledger). | P1 | Chủ DN | TBD |
| REQ-J02 | Tự cộng điểm khi `order.completed`. Công thức cấu hình được (mặc định 10.000₫ = 1 điểm, nhân hệ số theo hạng); tỉ lệ quy đổi điểm ↔ tiền cấu hình được. | P1 | — | TBD |
| REQ-J03 | Ghi nhận và điều chỉnh điểm thủ công (bắt buộc lý do, có log, hoàn tác được); **đổi điểm** khi tạo đơn hoặc hoá đơn (lấp gap G5). | P1 | Chủ DN | TBD |
| REQ-J04 | Agent biết hạng và điểm của khách để tư vấn ưu đãi; hiển thị trên Hồ sơ 360°. | P1 | Agent | TBD |
| REQ-J05 | Rule builder KHI · NẾU · THÌ (10 sự kiện); cảnh báo khách sắp rời bỏ. | P2 | — | TBD |

### Domain K — Tổng quan & Báo cáo
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-K01 | **Tổng quan:** "Việc cần tôi" (hàng chờ duyệt, hội thoại cần người, quá hạn), "AI đã làm gì hôm nay", Cần follow (tối đa 5), checklist onboarding 5 bước, số dư credit. | P0 | Chủ DN | TBD |
| REQ-K02 | **Báo cáo:** Hiệu suất AI Agent · Hội thoại & kênh · Doanh số & đơn · Khách hàng · Marketing · Ticket/SLA. Bộ lọc thời gian dùng chung; xuất Excel. Đọc từ Postgres / materialized view, nguyên tắc "1 con số 1 nguồn". | P1 | Chủ DN | TBD |
| REQ-K03 | Báo cáo lên lịch gửi email; AI narrative (diễn giải số liệu). | P2 | — | TBD |

### Domain L — Gói, Credit & Thanh toán
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-L01 | **Một đơn vị: Credit.** Mỗi lần gọi LLM ghi token × đơn giá model rồi quy ra credit; ví theo workspace; có lịch sử chi tiêu. | P0 | — | TBD |
| REQ-L02 | **Bảng gói và hạn mức lưu trong DB, cấu hình được** (seed theo prototype): giá, credit/tháng, số kênh, số agent, số user. Áp hạn mức (chặn thêm kênh / agent khi vượt). | P0 | Platform admin | TBD |
| REQ-L03 | **Hết credit:** chặn AI (hội thoại `auto` chuyển về người, có thông báo), cảnh báo ở mức 80%, popup nạp. Nạp xong mở lại ngay. Dữ liệu và hộp thư vẫn dùng bình thường. | P0 | Chủ DN | TBD |
| REQ-L04 | Thanh toán **VietQR**: QR động theo mã đơn, hết hạn 15 phút; webhook ngân hàng tự đối soát (idempotent theo `invoice_id`); sau đó kích hoạt gói hoặc cộng credit. Có thêm chuyển khoản thủ công (pending_review → admin xác nhận). | P0 | Chủ DN | TBD |
| REQ-L05 | Trang Gói & thanh toán: gói hiện tại, ngày hết hạn, credit còn lại, mua thêm (credit / kênh / user), lịch sử hoá đơn (PDF). | P0 | Chủ DN | TBD |
| REQ-L06 | Popup Nâng cấp: chọn Cá nhân / Doanh nghiệp, 4 thẻ gói, bảng so sánh. | P0 | Chủ DN | TBD |
| REQ-L07 | Hết hạn gói: popup gia hạn; dữ liệu giữ 30 ngày. Tự nạp khi số dư thấp. | P1 | — | TBD |
| REQ-L08 | **Trang quản trị nền tảng** (cho đội AppChat): quản lý tenant, gói, giá, đối soát chuyển khoản, đơn giá model. | P1 | Platform admin | TBD |

### Domain M — Cài đặt
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-M01 | Settings shell: menu trái chia nhóm, có tìm kiếm. Các trang: Tổng quan workspace · Thành viên · Kênh kết nối · Trợ lý AI website (widget) · Trường dữ liệu · Thẻ & nhãn · Câu trả lời mẫu · AI Models (bật/tắt nhà cung cấp) · AI Governance (ngưỡng, từ cấm, nhóm phải duyệt) · Nhật ký AI · Gói & thanh toán / Ví · Hồ sơ của tôi. | P0–P1 | Chủ DN | TBD |
| REQ-M02 | Giờ làm việc / giờ trực AI; thông báo (in-app + email). | P1 | Chủ DN | TBD |
| REQ-M03 | Tích hợp: Google Sheets, outbound webhook ký HMAC, API key. | P2 | — | TBD |
| REQ-M04 | Phòng ban, Sơ đồ tổ chức, KPI, Phân ca, vai trò tuỳ biến (khi khách lên gói Doanh nghiệp). | P3 | — | TBD |

### Domain N — Nền tảng & phi chức năng
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-N01 | **Không dùng Docker.** Monorepo: Next.js (web) + NestJS (api + worker). PostgreSQL 16 và Redis cài native (dev: Postgres 16 + Memurai trên Windows; prod: service native hoặc managed); chạy bằng PM2/systemd. | P0 | — | TBD |
| REQ-N02 | Prisma (schema + migration); RLS, partial index, expression index, `INCLUDE` viết bằng SQL thô trong migration. Query tuân thủ quy tắc index trong CLAUDE.md. | P0 | — | TBD |
| REQ-N03 | API REST `/v1`, OpenAPI tự sinh, cursor pagination, `Idempotency-Key`, lỗi chuẩn hoá. | P0 | — | TBD |
| REQ-N04 | Realtime bằng Socket.IO, room theo workspace / hội thoại; presence và typing. | P0 | — | TBD |
| REQ-N05 | Queue BullMQ + outbox; domain events nội bộ (`message.received`, `order.completed`, `ai.credit_used`…). Consumer idempotent. | P0 | — | TBD |
| REQ-N06 | Bảo mật: JWT ngắn hạn + refresh; mã hoá credential kênh (AES-256); TLS; OWASP Top 10; rate-limit. | P0 | — | TBD |
| REQ-N07 | Hiệu năng: tin nhắn p95 < 1s; API đọc p95 < 300ms. Uptime mục tiêu 99.9%. | P0 | — | TBD |
| REQ-N08 | Backup Postgres (PITR / dump hằng ngày); RPO ≤ 5 phút, RTO ≤ 1 giờ; quyền bị lãng quên (ẩn danh hoá). | P1 | — | TBD |
| REQ-N09 | Observability: log có cấu trúc, metric, trace (OpenTelemetry), cảnh báo lỗi kênh. | P1 | — | TBD |
| REQ-N10 | UI tiếng Việt mặc định với lớp i18n (next-intl), có `en`. Desktop-first, responsive. Đủ 5 trạng thái UI. WCAG AA. | P0 | — | TBD |
| REQ-N11 | Test: unit (business rules), integration, e2e Playwright cho luồng chính, test cô lập RLS, AI eval set cho agent bán hàng. | P0 | — | TBD |
| REQ-N12 | File: BE ≤ 600 dòng, FE ≤ 400 dòng; test để file riêng; commit kèm SHA. | P0 | — | TBD |

---

## AUTO-ANSWERED (from Scan Report)

- **Khách mục tiêu:** doanh nghiệp dịch vụ có khách quay lại; không làm TMĐT; taxonomy 10 nhóm ngành.
- **Tenant:** shared DB + RLS; billing / credit tách riêng theo workspace (BR-08).
- **Đơn vị tính phí:** Credit (1 credit = 10 token cũ); ẩn tên model với khách.
- **Trial:** Cá nhân Pro 15 ngày, 10.000 credit; hết hạn hạ về Miễn phí, thông báo đóng được.
- **Luồng bán hàng:** báo giá → đơn → hoá đơn → điểm loyalty; pipeline tự cập nhật.
- **Ngưỡng AI:** tự xử khi tin cậy ≥ 70%; HITL với việc chạm tiền, gửi hàng loạt, hợp đồng; Trợ lý không thực thi khi chưa xác nhận.
- **Platform:** desktop web trước; không native mobile; không SMS OTP.
- **Design tokens:** Plus Jakarta Sans; primary #2DC56A (bộ token cuối cùng chốt ở Vision — R17).
- **Prototype** (`specs/uploads/Platform AppChat`, bundle là bản mới nhất) là chuẩn UI và nhãn tiếng Việt.

## APPLICABLE STANDARDS (from coding-packs/standards/)

none — chưa có standards index; Standards Discovery đã được hoãn (chạy `/vibecode:scan --standards` sau Blueprint).

## DECISIONS LOG
| # | Decision | Options | Chosen | Rationale |
|---|---|---|---|---|
| D01 | Hình thái phát hành | MVP thu hẹp / sản phẩm đầy đủ | **Sản phẩm thương mại hoàn chỉnh, không gọi là MVP** | Chủ nhà chốt 2026-10-28 |
| D02 | Mô hình | — | **OPC: 1 chủ + đội AI Agents** | Chủ nhà nhắc lại |
| D03 | Lõi sản phẩm | — | **Trợ lý AI = agent bán hàng, 1 bộ não 2 mặt** (trực kênh và nhận lệnh nội bộ); các màn khác hiển thị việc agent làm | Chủ nhà chốt |
| D04 | Kênh khi phát hành | Zalo OA / FB / Zalo cá nhân / Web / Email | **Zalo cá nhân + Web widget + Email** | Chủ nhà chọn |
| D05 | Zalo cá nhân (API không chính thức) | làm / thay bằng OA / cả hai | **Làm, chấp nhận rủi ro**; adapter cô lập, có throttle chống khoá | Chủ nhà chốt |
| D06 | Quyền tự chủ của agent | theo spec / mọi thao tác ghi cần duyệt / tự chủ tối đa | **Theo spec** (≥70%, ép duyệt khi chạm tiền / hợp đồng / gửi hàng loạt) | Chủ nhà chọn |
| D07 | Module chưa làm | — | **Call Center, Workflow engine** | Chủ nhà chốt |
| D08 | Module phụ khi phát hành | — | **Ticket/SLA, Marketing broadcast, Loyalty, Báo cáo** (cùng CRM, Lịch hẹn, Billing, Cài đặt) | Chủ nhà chọn |
| D09 | Hết credit | chặn / chuyển model rẻ / trả sau, khoá ở 5tr | **Chặn AI + popup nạp**, cảnh báo 80%, dữ liệu vẫn dùng | Chủ nhà chọn |
| D10 | Bảng giá | chốt số / cấu hình được | **Lưu DB, cấu hình được**, seed theo prototype | Chủ nhà chọn |
| D11 | RBAC | 4 vai trò / 7 vai trò / Owner + Member | **Owner + Member** | Hợp mô hình OPC |
| D12 | Hạ tầng | Docker / native | **Không dùng Docker**; Next + Nest; Postgres + Redis native | Chủ nhà chốt |
| D13 | ORM | Prisma / Drizzle / TypeORM | **Prisma** (+ SQL thô cho RLS / index nâng cao) | Chủ nhà chọn |
| D14 | LLM | Claude / đa nhà cung cấp / gateway | **Đa nhà cung cấp** (LLM Router) | Chủ nhà chọn |
| D15 | Queue / Search / OLAP | Kafka, OpenSearch, ClickHouse / nhẹ hơn | **BullMQ + outbox, Postgres FTS (unaccent + pg_trgm), materialized view** | Chủ nhà đồng ý dùng Next + Nest tối giản, không thêm hạ tầng nặng |

## OPEN QUESTIONS
| # | Question | Impact | Suggested Resolution |
|---|---|---|---|
| OQ-01 | **Agent runtime:** tự xây trong Nest hay nhúng OpenFang? (Chủ nhà: chưa chốt) | Kiến trúc lõi D01 | Thiết kế **Agent Gateway interface** ngay từ đầu; triển khai mặc định là agent loop tự viết (TS, tool-use đa provider). Chốt OpenFang ở Vision sau khi spike 1–2 ngày. |
| OQ-02 | Gửi OTP đăng nhập qua kênh nào? Spec dùng Zalo OTP (ZNS cần Zalo OA, mà OA không có trong phạm vi) | REQ-A01 | Đề xuất: Email OTP + mật khẩu ngay; Zalo OTP qua ZNS khi có OA (P2). |
| OQ-03 | Thư viện Zalo cá nhân (ví dụ `zca-js`, Node) và chính sách giới hạn gửi | REQ-B02/B04, I03 | Spike kỹ thuật ở Blueprint; tham số throttle cấu hình được. |
| OQ-04 | Nhà cung cấp webhook ngân hàng cho VietQR (Casso / SePay / bank API) và tài khoản nhận tiền | REQ-L04 | Chủ nhà cung cấp; adapter có thể thay. |
| OQ-05 | API tra cứu MST (nhà cung cấp, chi phí) | REQ-A02 | Chủ nhà chọn; tạm thời cho nhập tay nếu tra cứu lỗi. |
| OQ-06 | Khoá API của các LLM provider và bảng đơn giá credit theo model | REQ-D02, L01 | Chủ nhà cung cấp khoá; đơn giá lưu DB. |
| OQ-07 | Hạ tầng production (VPS / cloud nào, domain, email gửi) | REQ-N01 | Chốt trước khi triển khai. |
| OQ-08 | Bộ design token cuối cùng (Design System hay `styles.css` của prototype — R17) | REQ-N10 | Chốt ở Vision. |

## SCOPE BOUNDARIES

### In Scope (bản phát hành thương mại đầu tiên)
- **Identity / Workspace / Trial / Owner + Member:** đăng ký và đăng nhập, khai báo DN bắt buộc, workspace với RLS, trial 15 ngày, phân quyền Owner + Member.
- **Kênh:**
  - Zalo cá nhân (1-1 và nhóm).
  - Web Live Chat widget.
  - Email.
- **Inbox realtime:** 3 cột, chế độ AI theo từng hội thoại, folder views riêng cho AI.
- **AI Sales Agent:**
  - Bộ tools bán hàng, RAG.
  - HITL, hàng chờ duyệt, nhật ký và hoàn tác.
  - Builder agent, LLM Router đa nhà cung cấp.
  - Follow-up chủ động.
- **Trợ lý AI:** chủ DN ra lệnh (Chat / Cowork).
- **CRM:** Khách hàng, Hồ sơ 360°, Sản phẩm, Báo giá, Đơn, Hoá đơn và thu tiền QR.
- **Lịch hẹn:** chống trùng lịch, nhắc hẹn.
- **Hỗ trợ:** Ticket/SLA (chính sách mặc định).
- **Marketing broadcast:** AI đề xuất, gửi qua Zalo cá nhân và Email, bắt buộc duyệt.
- **Loyalty:** hạng, tích và đổi điểm tự động.
- **Tổng quan và Báo cáo.**
- **Gói / Credit / VietQR:** cùng trang quản trị nền tảng.
- **Cài đặt:** các trang cốt lõi.

### Out of Scope (hoãn)
- Call Center / AI Voice / WebPhone.
- Workflow engine và builder.
- Zalo OA / ZNS, Facebook, Instagram, WhatsApp, Telegram, TikTok (P2).
- Hợp đồng và ký số (P2).
- Đa agent điều phối A2A (P2).
- Phòng ban, sơ đồ tổ chức, KPI, phân ca, vai trò tuỳ biến, SLA đa chính sách (P3).
- Help Center, Training Studio / canary, Dashboard builder, Template Studio.
- Kafka, ClickHouse, OpenSearch, K8s, Docker.
- Mobile native / PWA.

---

## Quality Gate: Self-Review

- **Completeness:** 6/6
  - ✅ Có REQ-ID cho các yêu cầu P0.
  - ✅ Đánh dấu các mục auto-answered.
  - ✅ Decisions log D01–D15 kèm lý do.
  - ✅ Open questions OQ-01–08.
  - ✅ Ma trận đủ cột REQ-ID / mô tả / ưu tiên / persona / TIP.
  - ✅ Applicable Standards = none.
- **Cross-reference với Scan Report:** khớp. Đã giải quyết các rủi ro R1, R3, R4, R5, R6, R7, R13, R14, R15. R12 (OpenFang) chuyển thành OQ-01, R17 thành OQ-08.
- **Lệch so với spec gốc (có chủ đích, theo Chủ nhà):**
  - Kênh chính là Zalo cá nhân thay vì Zalo OA.
  - RBAC rút còn Owner + Member.
  - Bỏ Docker / K8s; bỏ Go / Kafka.
  - Không đăng nhập OTP qua Zalo khi chưa có OA (OQ-02).
- **Gaps:** OQ-01 (agent runtime) là quyết định kiến trúc lớn nhất, cần chốt trước Blueprint. OQ-03 và OQ-04 cần spike hoặc thông tin từ Chủ nhà.
- **Confidence trên P0:** khoảng 85%.
