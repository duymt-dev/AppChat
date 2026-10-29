# AppChat — Requirements Matrix (RRI Report)

> Vibecode Kit v5.0 — BƯỚC 2 (RRI) Output
> Date: 2026-10-28
> Upstream: `00-PROJECT-CONTEXT.md` (scan 2026-10-27), `product/*`

---

## 0. Định hướng sản phẩm (chốt với Chủ nhà)

- **Mô hình OPC (One-Person Company):** một chủ doanh nghiệp vận hành toàn bộ công việc cùng **đội AI Agents**. Thành viên là người thật thì không bắt buộc.
- **Lõi sản phẩm: Trợ lý AI là Orchestrator kiêm Copilot của toàn nền tảng.** Nó *không phải* một agent bán hàng.
  - **Copilot:** điều khiển được **mọi action có trên UI**. Việc gì người dùng làm được bằng giao diện thì Trợ lý AI cũng làm được bằng hội thoại: tạo, sửa, xoá, gửi, cấu hình, tra cứu, điều hướng. Trợ lý chạy với đúng quyền của người đang ra lệnh.
  - **Orchestrator:** phân rã yêu cầu, **giao việc cho các AI Agent chuyên trách** (Sales, CSKH, Booking, Marketing, Kế toán, Vận hành…), theo dõi tiến độ, rồi tổng hợp kết quả.
  - **Đi kèm mọi màn:** có bản thu nhỏ trong từng module, tự nạp ngữ cảnh bản ghi đang xem.
- **AI Agents chuyên trách** được cấu hình ở module AI Agents. Chúng là đơn vị thực thi:
  - Một số **trực kênh** để tư vấn và bán cho khách qua Zalo cá nhân, Web chat, Email.
  - Số khác nhận việc từ Trợ lý AI.
- **Vai trò các màn còn lại** (Hộp thư, CRM, Lịch hẹn, Ticket, Marketing, Loyalty, Cài đặt…): là nơi **hiển thị và quản lý những gì Trợ lý AI và các agent đã làm**, và là nơi người dùng thao tác trực tiếp khi cần.
- **Nguyên tắc kiến trúc hệ quả: "Action-first".** Mọi thao tác trên UI là một **action đã đăng ký** trong một Action Registry dùng chung. Mỗi action gồm schema, quyền, mức rủi ro, có cần xác nhận hay không, và cách hoàn tác. UI và Trợ lý AI gọi **cùng** action đó, nên không có thao tác nào "chỉ bấm tay được".
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
| REQ-A03 | Workspace là tenant; **mỗi workspace một PostgreSQL database riêng**, tạo tự động khi đăng ký (DB nền tảng giữ identity, membership, gói, ví, registry). Migration áp cho mọi DB tenant; có test tự động chống rò rỉ dữ liệu giữa các tenant (D21). | P0 | — | TBD |
| REQ-A04 | Một user thuộc được nhiều workspace (membership N–N), chuyển workspace ngay từ menu Hồ sơ. | P1 | Chủ DN | TBD |
| REQ-A05 | **Phân quyền theo permission + phạm vi dữ liệu (D27).** 5 vai trò mặc định: Chủ sở hữu · Quản lý · Sales · CSKH · Kế toán. Phạm vi dữ liệu theo module: Của tôi / Nhóm / Tất cả (sales chỉ thấy khách, hội thoại, báo giá, đơn được gán). AI chạy đúng quyền người ra lệnh. Trang Vai trò & phân quyền ở chế độ chỉ đọc. Mời thành viên bằng email hoặc SĐT; số user giới hạn theo gói. Chuẩn: `standards/authz/rbac-permissions.md`. | P0 | Chủ DN | TBD |
| REQ-A05b | Vai trò tuỳ biến (nhân bản từ vai trò hệ thống, sửa ma trận quyền theo prototype), quản lý Nhóm (team), ẩn trường theo vai trò. | P1 | Chủ DN | TBD |
| REQ-A06 | Trial 15 ngày gói Cá nhân Pro, kèm 10.000 credit; có màn chào mừng (2 nút) và badge "Còn X ngày". Hết hạn thì hạ về gói Miễn phí; thông báo đóng được; dữ liệu giữ nguyên. | P0 | Chủ DN | TBD |
| REQ-A07 | Audit log cho mọi hành động quản trị, của người và của AI. | P1 | — | TBD |
| REQ-A09 | **Tự lưu trữ workspace gói Miễn phí không hoạt động 90 ngày** (ngưỡng cấu hình theo gói): báo trước 14 ngày; lưu trữ = dump DB + drop; đăng nhập lại thì tự khôi phục (< 2 phút), dữ liệu giữ nguyên. Trial và gói trả phí không bao giờ bị lưu trữ. Bản lưu trữ không tự xoá. | P1 | Chủ DN / Platform admin | TBD |
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
| REQ-B09 | **Một kênh nhiều tài khoản** (ver2.1 #14): mỗi loại kênh trong manifest (Zalo cá nhân · Email · Webchat) có danh sách tài khoản. Trạng thái kênh lấy từ tài khoản: sức khoẻ = tài khoản kém nhất, hội thoại cộng dồn. "Kết nối" = thêm tài khoản; Quản lý 2 cấp (danh sách → chi tiết 1 tài khoản); ngắt tài khoản cuối thì kênh thành Chưa kết nối. Bộ lọc tài khoản ở Hộp thư lấy từ cùng dữ liệu. | P0 | Chủ | TBD (ver2.1) |
| REQ-B10 | **Kết nối kênh 3 bước** dùng chung (ver2.1 #15): chọn kênh → xác thực (QR Zalo cá nhân · form Email IMAP / SMTP có *Kiểm tra kết nối* · Webchat) → cấu hình nhanh (tên, AI Agent, chế độ AI trả lời ngay / gợi ý / tắt, cách chia). Nhánh OAuth và kênh ngoài manifest hiện "Sắp có" (D04, D28). Không có "Phòng ban nhận" (Teams là P1). | P0 | Chủ | TBD (ver2.1) |
| REQ-B11 | **Drawer Quản lý kênh** (ver2.1 #15), mỗi tài khoản: tổng quan kết nối (kiểm tra, đồng bộ lại) · hiệu suất 7 ngày · trả lời tự động (agent, chế độ, giờ, lời chào) · phân công & SLA · đồng bộ (tin nhắn, tự tạo liên hệ, lịch sử 0 / 7 / 30 / 90 ngày) · vùng nguy hiểm (tạm dừng / tiếp tục, kết nối lại, ngắt). Không đồng bộ bình luận / đánh giá (kênh FB ngoài phạm vi). | P0 | Chủ | TBD (ver2.1) |

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
| REQ-C09 | **Menu ⋯ tin nhắn** (ver2.1 #1): hàng cảm xúc 👍❤️😂😮😢🙏 (bấm lại để bỏ) · Trả lời (trích tin) · Sao chép · Chuyển tiếp · Ghim tin nhắn · Dịch · Tạo ticket từ tin này (điền sẵn) · nhóm nguy hiểm Thu hồi (chỉ tin của mình) / Xoá (xác nhận). Cảm xúc chỉ hiện ở kênh hỗ trợ. | P0 | Member | TBD (ver2.1) |
| REQ-C10 | **Menu ⋯ hội thoại có submenu** (ver2.1 #2), submenu thay nội dung + nút ‹: Đóng · Tạm ẩn (1 giờ / 3 giờ / sáng mai / tuỳ chọn) · Phím tắt (chèn câu trả lời mẫu vào khung nhập) · Phân công (nhân viên + AI Agent, kèm tải) · Vòng đời (**enum `contact.stage` hiện có** — D49) · Gắn thẻ nhiều (tạo thẻ mới). Dưới đường kẻ: Lưu trữ · **Ẩn trò chuyện** (D50) · Tạo nhóm ("Sắp có") · Xoá lịch sử (xác nhận). | P0 | Member | TBD (ver2.1) |
| REQ-C11 | **Menu ＋ khung nhập** (ver2.1 #5): Thêm tệp · Chụp ảnh màn hình · Skills › (lệnh /…, bấm là chèn) · Nền tảng kết nối › · Tiện ích › — đọc **cấp quyền của Agent phụ trách hội thoại** (mục chưa cấp thì mờ + "Chưa cấp cho …") · Research / Web search hiện "Sắp có" (D48). | P0 | Member | TBD (ver2.1) |
| REQ-C12 | **Tìm trong hội thoại** (ver2.1 #9): thanh tìm dưới tiêu đề, không dấu, tô vàng, kết quả đang chọn viền cam, bộ đếm N/M, ↑↓ / Enter / Shift+Enter / Esc, lọc người gửi (Tất cả / Khách / Nhân viên / AI Agent). | P0 | Member | TBD (ver2.1) |
| REQ-C13 | **Header + khung nhập theo ver2.1:** bỏ nút video / gọi điện (D07); bỏ chế độ "Trả lời" và 6 icon thanh công cụ; dòng "Người gửi: <tên> (bạn)"; tin gửi đi hiện tên người gửi; bỏ hàng "Thả nhanh" (cảm xúc chuyển vào REQ-C09). | P0 | Member | TBD (ver2.1) |

### Domain D — AI Agents chuyên trách (đơn vị thực thi, trực kênh)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-D01 | **Agent runtime** chạy sau một interface **Agent Gateway** để có thể thay động cơ (xem OQ-01). Agent loop gồm: nhận ngữ cảnh → RAG → gọi tools → trả lời. Tin nhắn vào được xử lý bất đồng bộ trong worker, stream kết quả. | P0 | — | TBD |
| REQ-D02 | **LLM Router đa nhà cung cấp** (Claude / GPT / Gemini / DeepSeek) **+ mọi router OpenAI-compatible (OpenRouter, 9router…) — D33**. Định tuyến theo tác vụ, gói và chi phí; có fallback khi nhà cung cấp lỗi. Ẩn tên model với khách (chỉ hiện "AI tiêu chuẩn / nâng cao"). | P0 | — | TBD |
| REQ-D03 | **Tools của agent = tập con của Action Registry** (REQ-E01), được cấp quyền theo từng agent. Bộ mặc định cho Sales agent: tra cứu sản phẩm / giá / tồn kho; tạo và cập nhật khách hàng; tạo báo giá; tạo đơn; đặt / dời / huỷ lịch hẹn (có kiểm tra trùng); tạo ticket; gắn thẻ; gửi file / ảnh sản phẩm; chuyển người. | P0 | — | TBD |
| REQ-D04 | **Kho tri thức (RAG)** theo trang Dữ liệu RAG của prototype: thư mục, thẻ, nguồn (tải lên PDF / DOCX / XLSX / CSV / TXT / MD, URL, văn bản, danh mục sản phẩm; Drive = "Sắp có"); trạng thái index, số đoạn, index lại. Tài liệu `public` / `internal`. Agent nhận tri thức theo thư mục / thẻ. Tìm kết hợp vector + từ khoá không dấu, ngưỡng căn cứ (không bịa), trích nguồn. **Giá / tồn / lịch luôn lấy qua tool, không lấy từ RAG.** Chuẩn: `standards/ai/rag.md`. | P0 | Chủ DN | TBD |
| REQ-D04b | **AI học từ hội thoại:** từ hội thoại đã giải quyết, AI đề xuất cặp hỏi–đáp vào hàng chờ "AI đã học"; **người duyệt (sửa được) rồi mới vào kho**. | P1 | Chủ DN | TBD |
| REQ-D05 | **Ranh giới tự chủ (theo spec):** agent tự trả lời, tạo / cập nhật khách, đặt lịch, tạo báo giá và đơn theo bảng giá khi **độ tin cậy ≥ 70%**. **Bắt buộc người duyệt** khi: giảm giá ngoài chính sách, hoàn tiền, báo giá vượt ngưỡng (cấu hình được, mặc định 20 triệu), hợp đồng, gửi hàng loạt. | P0 | Chủ DN | TBD |
| REQ-D06 | **Handoff sang người** khi: độ tin cậy thấp, khách đòi gặp người, khách hỏi lặp lại 3 lần, cảm xúc tiêu cực hoặc khiếu nại, ngoài phạm vi. Kèm tóm tắt và bản nháp; hội thoại chuyển sang folder "Cần người". | P0 | — | TBD |
| REQ-D07 | **Hàng chờ duyệt:** thẻ Duyệt / Sửa / Từ chối cho các hành động cần người, hiện ở Inbox, Tổng quan và thông báo. | P0 | Chủ DN | TBD |
| REQ-D08 | **Nhật ký hành động AI:** ghi mọi lần chạy (prompt, nguồn tri thức, tools đã gọi, token, credit); **hoàn tác được** với nhóm hành động cho phép. | P0 | Chủ DN | TBD |
| REQ-D09 | **Hồ sơ & Builder AI Agent** theo prototype: tên, emoji / ảnh, vai trò, ngôn ngữ (Việt / Anh / song ngữ / theo khách), prompt (mẫu + "Tối ưu prompt" bằng AI), nhóm ý định phụ trách, kênh (theo channel registry), hành động (từ action `agentGrantable`, có mô tả), phạm vi tri thức, ngưỡng tin cậy, giờ trực, quy tắc duyệt, mức AI (tiêu chuẩn / nâng cao / tối đa — **ẩn tên model**). **Bản nháp ↔ bản đang chạy:** sửa không ảnh hưởng tới khi Xuất bản; mỗi lần xuất bản là một phiên bản, run ghi phiên bản, quay lại được. **Chat thử chạy giả lập** (action chỉ preview, không ghi thật). | P0 | Chủ DN | TBD |
| REQ-D09b | **3 cách tạo agent** (prototype): Tạo thủ công (builder) · Từ mẫu theo ngành · **Trợ lý AI** (mô tả bằng lời → Trợ lý soạn cấu hình → một thẻ xác nhận "Tạo & xuất bản" → agent chạy ngay; hoặc "Mở trong builder" để sửa trước). Tools cấp cho agent ⊆ quyền người tạo ∩ `agentGrantable`; tool chạm tiền / xoá mặc định bật duyệt; giới hạn `plan.max_agents`. Trợ lý **không** tự tạo agent tạm trong lúc chạy; thiếu agent phù hợp thì gợi ý tạo (D29). | P0 | Chủ DN | TBD |
| REQ-D10 | **Trí nhớ khách hàng:** agent đọc Hồ sơ 360° (lịch sử mua, lịch hẹn, ghi chú, hạng loyalty) trước khi trả lời và ghi lại sự kiện quan trọng. | P0 | — | TBD |
| REQ-D11 | Lọc PII trước khi đưa vào prompt (CMND, số thẻ, số tài khoản); có guardrail và danh sách từ cấm. | P1 | — | TBD |
| REQ-D12 | **Chủ động (Hands):** follow-up khách im lặng, nhắc lịch hẹn, chăm sóc sau mua, hỏi lại báo giá đang treo. Chạy theo lịch, phải tôn trọng giới hạn gửi của Zalo cá nhân. | P1 | — | TBD |
| REQ-D13 | Agent chuyên trách phối hợp với nhau: **chuyển hội thoại** (Sales → Booking → trả lại Sales) và **hỏi ý agent khác** ở hậu trường (Sales hỏi Kế toán về công nợ). Luôn có đầu mối, giới hạn số bước chuyển, ngân sách credit, trace đầy đủ; Trợ lý AI giám sát. **Không làm swarm** (D17). | P1 | — | TBD |
| REQ-D15 | Bộ agent mẫu sẵn có: **Sales, CSKH, Booking, Marketing, Kế toán, Vận hành**. Mỗi agent có vai trò, tools mặc định và mẫu theo ngành. | P0 | Chủ DN | TBD |
| REQ-D14 | Hiệu suất agent: số hội thoại, tỉ lệ tự xử lý, tỉ lệ chốt, CSAT, credit đã dùng; đo ngang hàng với nhân sự. | P1 | Chủ DN | TBD |
| REQ-D16 | **Danh mục công cụ cấp theo Agent** (ver2.1 #4): một danh mục chung gồm Skills · Nền tảng kết nối · Tiện ích, mỗi mục ánh xạ **action id của Action Registry** hoặc **connector manifest** (D47). Tab Công cụ & Quyền có 3 khối công tắc n/tổng cho đúng Agent đang mở. Connector ngoài manifest hiện "Sắp có". | P0 | Chủ | TBD (ver2.1) |

### Domain E — Trợ lý AI: Orchestrator & Copilot của nền tảng (LÕI)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-E01 | **Action Registry dùng chung.** Mọi thao tác trên UI của *mọi* module (tạo / sửa / xoá / gửi / gán / đổi trạng thái / cấu hình / xuất…) được khai báo **một lần**. Mỗi action có: tên, mô tả cho LLM, input schema (Zod/JSON Schema), quyền yêu cầu, **mức rủi ro** (đọc / ghi / gửi ra ngoài / chạm tiền / xoá), cần xác nhận hay không, và **handler hoàn tác**. Frontend gọi qua API; Trợ lý và agents gọi qua tool-use. Cùng một đường thực thi, cùng validation, cùng audit. | P0 | — | TBD |
| REQ-E02 | **Copilot điều khiển toàn bộ UI:** Trợ lý AI làm được *mọi* action trong Registry **với đúng quyền của người đang ra lệnh** (vai trò + phạm vi dữ liệu — D27), không vượt quyền. Ví dụ: "tạo khách mới tên…", "đổi lịch chị Lan sang 3h chiều", "gửi báo giá BG-102 qua Zalo", "kết nối Zalo mới", "thêm thẻ VIP cho 20 khách mua nhiều nhất", "tắt AI cho hội thoại này", "tạo agent CSKH cho spa". | P0 | Chủ DN / Member | TBD |
| REQ-E03 | **Xác nhận theo mức rủi ro (BR-05):** action chỉ đọc thì chạy ngay. Action ghi, gửi, xoá hoặc chạm tiền thì hiện **thẻ xem trước** (diff trước/sau, số bản ghi bị ảnh hưởng) với các nút Xác nhận / Sửa / Huỷ. Thao tác hàng loạt bắt buộc xác nhận số lượng. Luôn đề xuất tái dùng luồng đã làm trước đó. | P0 | Chủ DN | TBD |
| REQ-E04 | **Orchestrator điều phối agents:** phân rã yêu cầu nhiều bước thành kế hoạch; giao từng bước cho AI Agent chuyên trách phù hợp (Sales / CSKH / Booking / Marketing / Kế toán / Vận hành); hiển thị kế hoạch và tiến độ từng bước; tổng hợp kết quả. Người dùng xem, dừng, sửa kế hoạch được. | P0 | Chủ DN | TBD |
| REQ-E05 | **Điều khiển giao diện (UI control):** Trợ lý có thể điều hướng tới màn, mở bản ghi / drawer / panel 360°, **điền sẵn form** để người dùng xem rồi bấm lưu, làm nổi bật phần tử, áp bộ lọc lên bảng. Thực hiện qua command bus phía client. Câu trả lời kèm **thẻ hành động deep-link** tới kết quả. | P0 | Chủ DN | TBD |
| REQ-E06 | **Có mặt ở mọi màn:** bản thu nhỏ "Trợ lý AI · [module]" trong từng module, tự nạp ngữ cảnh (màn hiện tại, bản ghi đang xem, dòng đang chọn). Có thể gọi bằng phím tắt (⌘K / Ctrl+K). | P0 | Chủ DN / Member | TBD |
| REQ-E07 | **Truy vấn và phân tích bằng ngôn ngữ tự nhiên** trên dữ liệu workspace: "doanh số tuần này", "khách nào sắp rời bỏ", "agent nào chốt tốt nhất". Trả lời bằng số liệu, bảng hoặc biểu đồ, có nguồn (link về bản ghi / danh sách đã lọc). Chỉ đọc. | P0 | Chủ DN | TBD |
| REQ-E08 | **Chủ động (briefing):** đầu ngày tóm tắt "việc cần tôi" (hàng chờ duyệt, hội thoại cần người, lịch hôm nay, quá hạn SLA, credit sắp hết) kèm đề xuất hành động một chạm. | P1 | Chủ DN | TBD |
| REQ-E09 | **Nhật ký hành động và hoàn tác:** mọi action do Trợ lý hoặc agent thực thi được ghi lại (ai ra lệnh, action, input, trước/sau, agent nào, credit). Có lọc theo loại (tạo / cập nhật / gửi / xuất). Hoàn tác được khi action thuộc nhóm cho phép và còn trong thời hạn; đã gửi ra ngoài thì chỉ ghi đính chính. | P0 | Chủ DN | TBD |
| REQ-E10 | Lưu "Nội dung trò chuyện": danh sách phiên, tìm kiếm, mở lại; nhớ ngữ cảnh dài trong phiên. | P1 | Chủ DN | TBD |
| REQ-E11 | Hai chế độ **Chat** (tư duy, lên ý tưởng, không đổi dữ liệu) và **Cowork** (thực thi, điều phối agents); chọn agent và cấp độ AI. | P1 | Chủ DN | TBD |
| REQ-E12 | Đính kèm tệp, ảnh, email vào lệnh (ví dụ "nhập danh sách khách từ file này", "tạo sản phẩm từ ảnh bảng giá"); nhập lệnh bằng giọng nói. | P1 | Chủ DN | TBD |
| REQ-E13 | **Tác vụ tự chủ (Coworks):** giao một mục tiêu cho agent chạy ngay / theo lịch / theo sự kiện. Có giới hạn công cụ và dữ liệu, giới hạn credit mỗi lần chạy. Luôn hỏi trước khi xoá; hỏi trước khi gửi ra ngoài (bật/tắt được). | P1 | Chủ DN | TBD |
| REQ-E14 | **Khung "Trợ lý AI đang điều phối"** ở Cowork (ver2.1 #4): một hàng thu gọn "N việc · x đang chạy · y cần bạn duyệt · Xem chi tiết ›" mở modal danh sách việc (agent, công cụ, tiến độ, trạng thái) với Dừng (`run.cancel`) · Duyệt & gửi (`approval.approve`) · Xem kết quả. | P0 | Chủ | TBD (ver2.1) |

### Domain F — Khách hàng & Bán hàng (CRM)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-F01 | **Khách hàng:** danh sách (bảng với cột tuỳ biến, lọc, tìm không dấu) và kanban theo giai đoạn (Lead mới → Tiềm năng → Đang tư vấn → Báo giá → Đã mua). Cột "AI gợi ý" kèm nút "Giao AI". | P0 | Chủ DN | TBD |
| REQ-F01b | **Nhiều sales chăm một khách (D32):** 1 người phụ trách chính + nhiều người đồng phụ trách / theo dõi; scope "Của tôi" gồm cả khách mình đồng phụ trách; chống giành khách (trùng thì chỉ hiện "Đã có người phụ trách" + "Xin chia sẻ"); chuyển phụ trách (Quản lý) có tuỳ chọn chuyển kèm hội thoại / báo giá đang mở, ghi timeline; tin mới tự gán cho người phụ trách (vắng / ngoài ca → hàng chung hoặc agent); doanh số ghi theo người phụ trách lúc tạo chứng từ. Chuẩn: `standards/authz/rbac-permissions.md` §Chăm sóc khách. | P0 | Chủ DN | TBD |
| REQ-F01c | Chia lead tự động: thủ công / vòng tròn / theo kênh / theo tải. | P1 | Chủ DN | TBD |
| REQ-F02 | **Hồ sơ 360°:** tóm tắt AI, thông tin, timeline đa kênh, đơn / báo giá / lịch hẹn / ticket, ghi chú, hạng loyalty. | P0 | Chủ DN | TBD |
| REQ-F03 | Check trùng và gộp hồ sơ (SĐT / email / ID kênh / MST); import và export Excel. | P1 | Chủ DN | TBD |
| REQ-F04 | **Custom fields** theo workspace và ngành (Text, Number, Currency, Date, Phone, Email, Picklist, Lookup, File), tự áp vào bảng, form, bộ lọc và chi tiết. | P1 | Chủ DN | TBD |
| REQ-F05 | **Sản phẩm & Dịch vụ:** 6 loại (vật lý / dịch vụ / combo / thẻ-liệu trình / số / cho thuê); giá chưa VAT, giá vốn, ĐVT, thuế theo dòng, ảnh, danh mục; **biến thể** (P1); **tồn kho** trừ khi đơn xác nhận, hoàn khi huỷ, cho phép âm kèm cảnh báo (D24). **Agent dùng làm nguồn tư vấn và báo giá.** | P0 | Chủ DN | TBD |
| REQ-F06 | **Báo giá:** agent hoặc người tạo; chiết khấu theo dòng và trên tổng, thuế sau chiết khấu; **hiệu lực 15 ngày kể từ lúc gửi**; versioning n+1; duyệt chỉ khi vượt ngưỡng (> 20 triệu hoặc giảm > 5%); gửi PDF qua kênh; khách phản hồi trong chat thì AI cập nhật trạng thái; báo giá chấp nhận → nút **"→ Đơn hàng"** (D24). | P0 | Chủ DN / Agent | TBD |
| REQ-F06b | **Mẫu chứng từ của DN + AI soạn (D30):** mẫu báo giá / hợp đồng / đề nghị thanh toán / phiếu thu soạn trong trình soạn **hoặc tải DOCX của DN** (AI nhận diện biến, người xác nhận). AI soạn báo giá / hợp đồng từ nội dung người dùng đưa (ghi chú, chat, brief): giá lấy từ catalog, điều khoản mẫu giữ nguyên văn, điều khoản AI đề xuất tô nổi; bảng kiểm Điều 398 BLDS (cảnh báo, không chặn). Luật đã chốt giữ nguyên. Chuẩn: `standards/documents/templates.md`. | P0 | Chủ DN | TBD |
| REQ-F07 | **Đơn hàng:** tạo từ báo giá, gợi ý từ lịch hẹn hoàn tất, hoặc trực tiếp. **Hai trục:** tiến độ (Mới → Đang xử lý → **Hoàn tất** / Huỷ) và thanh toán (Chưa TT · **Chờ cọc** (chỉ đơn cần cọc) · Đã cọc · Một phần · Đã TT · Đã hoàn). Huỷ đơn đã thu tiền thì sinh hoàn tiền có duyệt; vận chuyển nhập tay. `order.completed` cộng điểm (D24). | P0 | Chủ DN / Agent | TBD |
| REQ-F07b | **Đồng bộ đơn từ sàn / POS (D31):** port `OrderSyncProvider` trong Cài đặt → Nền tảng kết nối (Sapo, Shopee, TikTok Shop, Lazada, Haravan, KiotViet, WooCommerce = "Sắp có"); đơn có nguồn + mã ngoài, nhập một lần, ánh xạ trạng thái sàn về 2 trục; đơn sàn khoá dòng hàng / giá; thanh toán "qua sàn" không sinh đề nghị thanh toán; bên giữ tồn chuẩn chọn theo kết nối; khách khớp theo buyer id; **tích điểm đơn sàn mặc định tắt**. Khung + mock: P0; adapter thật: P2. | P0 (khung) / P2 (adapter) | Chủ DN | TBD |
| REQ-F08 | **Đề nghị thanh toán & thu tiền** (không thay hoá đơn GTGT; hoá đơn điện tử P2): cọc / đợt / toàn bộ; VietQR; hạn 7 ngày, nhắc T-1/T+1/T+7; xác nhận tay **hoặc** đối soát tự động khi DN kết nối SePay/Casso; phiếu thu; công nợ theo khách; hoàn tiền luôn duyệt (D24). | P0 | Chủ DN | TBD |
| REQ-G07 | **Liệu trình / gói buổi:** gói sinh khi đơn có gói được xác nhận và đã thu đủ (hoặc đã cọc nếu cho phép); lịch hẹn hoàn tất thì trừ 1 buổi; no-show không trừ (cấu hình được); nhắc khi còn 1 buổi / 7 ngày; hết hạn thì khoá, Owner gia hạn tay; hiển thị ở 360°, agent đọc được (D24). | P0 | Chủ DN / Agent | TBD |
| REQ-F09 | **Hợp đồng:** tạo từ báo giá đã chấp nhận (tuỳ chọn) hoặc trực tiếp; 3 loại (Dịch vụ / Mua bán / Nguyên tắc); nội dung từ mẫu theo loại hoặc PDF tải lên; Owner duyệt và ký trước, rồi gửi khách **ký điện tử** (link + OTP + ký tay, lưu vết + trang chứng nhận + SHA-256); đã ký thì khoá, thay đổi qua phụ lục; sinh đơn từ hợp đồng; nhắc gia hạn T-30, tự hết hạn; ký số CA ở P2 (D25). | **P0** | Chủ DN / Agent (nháp) | TBD |
| REQ-F10 | Pipeline tự cập nhật giai đoạn khách: gửi báo giá → Báo giá; hợp đồng gửi ký / đã ký → Hợp đồng; đơn hoàn tất → Đã mua; báo giá từ chối / hết hạn → Đang tư vấn; không hạ giai đoạn của khách đã mua; kéo tay luôn thắng (thay BR-09; D24). | P0 | — | TBD |
| REQ-F11 | **Hồ sơ 360° — 6 nút mở form tại chỗ** (ver2.1 #3 / #8), điền sẵn khách, không rời Hộp thư / Khách hàng. Theo **luật COMMERCE (D46)**: báo giá Nháp → Cập nhật; báo giá đã gửi → *Tạo phiên bản mới*; hợp đồng Nháp → Cập nhật; hợp đồng đã gửi ký → mở chi tiết (chỉ xem); chưa có → Tạo mới. Đơn / Ticket / Lịch hẹn: tạo mới. Gửi email: modal soạn email (từ, đến, 3 mẫu). 6 nút cùng kích thước, nền trắng viền xám (ver2.1 #10). | P0 | Member | TBD (ver2.1) |
| REQ-F12 | **Bố cục Hồ sơ 360° theo mẫu & vai trò** (ver2.1 #6 / #7): nút ⚙ trên thanh tab mở *Tuỳ chỉnh*: bật / tắt, đổi tên, đổi thứ tự, xoá (cả tab mặc định, có khôi phục), thêm tab mới, thêm khối từ thư viện 12 khối (khối bổ sung hiện dưới nội dung gốc). Luôn giữ ≥ 1 tab. Mẫu gán cho **5 vai trò hệ thống D27** (mỗi vai trò một mẫu); 3 mẫu có sẵn: Mặc định · CSKH · Kinh doanh. | P0 | Chủ | TBD (ver2.1) |

### Domain G — Lịch hẹn
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-G01 | Lịch xem theo ngày / tuần / tháng / danh sách; dịch vụ (thời lượng, giá, thời gian đệm); nhân sự hoặc tài nguyên phụ trách; giờ mở cửa. | P0 | Chủ DN | TBD |
| REQ-G02 | Trạng thái lịch (bản rút gọn từ spec): Chờ xác nhận (giữ chỗ 2 giờ) → Đã xác nhận → Hoàn tất / Khách không đến (ân hạn 20 phút) / Đã dời / Đã huỷ (bắt buộc lý do). | P0 | — | TBD |
| REQ-G03 | **Chống trùng lịch** theo nhân sự (P0) và theo phòng / thiết bị (P2); agent gợi ý slot trống gần nhất. | P0 | Agent | TBD |
| REQ-G04 | Nhắc hẹn trước 24 giờ và 2 giờ qua kênh khách đã dùng; khách trả lời "đổi" hoặc "huỷ" thì agent xử lý. | P1 | Agent | TBD |
| REQ-G05 | Bắt buộc gắn lịch với Khách hàng trong CRM. | P0 | — | TBD |
| REQ-G06 | Danh sách chờ, lịch lặp, dự báo no-show, đặt cọc. | P2 | — | TBD |

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
| REQ-J02 | Tự cộng điểm **một lần** khi `order.completed`: **10.000đ = 1 điểm** trên số tiền thực trả sau chiết khấu, trước VAT, nhân hệ số hạng (Vàng ×1,5, Kim cương ×2); quy đổi 1 điểm = 100đ; cấu hình được (D24). | P1 | — | TBD |
| REQ-J03 | Ghi nhận và điều chỉnh điểm thủ công (bắt buộc lý do, có log, hoàn tác được); **đổi điểm** khi thanh toán (tối đa 50% giá trị đơn); huỷ / hoàn tiền thì đảo điểm theo tỉ lệ; điểm hết hạn 12 tháng; xét hạng mỗi quý (D24). | P1 | Chủ DN | TBD |
| REQ-J04 | Agent biết hạng và điểm của khách để tư vấn ưu đãi; hiển thị trên Hồ sơ 360°. | P1 | Agent | TBD |
| REQ-J05 | Rule builder KHI · NẾU · THÌ (10 sự kiện); cảnh báo khách sắp rời bỏ. | P2 | — | TBD |

### Domain K — Tổng quan
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-K01 | **Tổng quan:** "Việc cần tôi" (hàng chờ duyệt, hội thoại cần người, quá hạn), "AI đã làm gì hôm nay", Cần follow (tối đa 5), checklist onboarding 5 bước, số dư credit. | P0 | Chủ DN | TBD |
| ~~REQ-K02~~ | ~~Báo cáo (6 nhóm, xuất Excel)~~ — **loại bỏ 2026-10-28 (D19)**. | — | — | — |

### Domain L — Gói, Credit & Thanh toán
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-L01 | **Một đơn vị: Credit.** Mỗi lần gọi LLM ghi token × đơn giá model rồi quy ra credit; ví theo workspace; có lịch sử chi tiêu. | P0 | — | TBD |
| REQ-L02 | **Bảng gói và hạn mức lưu trong DB, cấu hình được** (seed theo prototype): giá, credit/tháng, số kênh, số agent, số user. Áp hạn mức (chặn thêm kênh / agent khi vượt). | P0 | Platform admin | TBD |
| REQ-L03 | **Hết credit:** chặn AI (hội thoại `auto` chuyển về người, có thông báo), cảnh báo ở mức 80%, popup nạp. Nạp xong mở lại ngay. Dữ liệu và hộp thư vẫn dùng bình thường. | P0 | Chủ DN | TBD |
| REQ-L04 | Thanh toán **VietQR**: QR động theo mã đơn, hết hạn 15 phút; webhook ngân hàng tự đối soát (idempotent theo `invoice_id`); sau đó kích hoạt gói hoặc cộng credit. Có thêm chuyển khoản thủ công (pending_review → admin xác nhận). | P0 | Chủ DN | TBD |
| REQ-L05 | Trang Gói & thanh toán: gói hiện tại, ngày hết hạn, credit còn lại, mua thêm (credit / kênh / user), lịch sử hoá đơn (PDF). | P0 | Chủ DN | TBD |
| REQ-L06 | Popup Nâng cấp: chọn Cá nhân / Doanh nghiệp, 4 thẻ gói, bảng so sánh. | P0 | Chủ DN | TBD |
| REQ-L07 | Hết hạn gói: popup gia hạn; dữ liệu giữ 30 ngày. Nhắc khi credit đã dùng 80% / 95% (**bỏ tự nạp** vì VietQR không trừ tự động — D24). Credit gói không cộng dồn; credit mua thêm không hết hạn; nâng gói giữa kỳ tính chênh theo ngày. | P1 | — | TBD |
| REQ-L08 | **Trang quản trị nền tảng** (cho đội AppChat): quản lý tenant, gói, giá, đối soát chuyển khoản, đơn giá model. | P1 | Platform admin | TBD |

### Domain M — Cài đặt
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-M01 | Settings shell: menu trái chia nhóm, có tìm kiếm. Các trang: Tổng quan workspace · Thành viên · Kênh kết nối · Trợ lý AI website (widget) · Trường dữ liệu · Thẻ & nhãn · Câu trả lời mẫu · AI Models (bật/tắt nhà cung cấp) · AI Governance (ngưỡng, từ cấm, nhóm phải duyệt) · Nhật ký AI · Gói & thanh toán / Ví · Hồ sơ của tôi. | P0–P1 | Chủ DN | TBD |
| REQ-M02 | Giờ làm việc / giờ trực AI; thông báo (in-app + email). | P1 | Chủ DN | TBD |
| REQ-M03 | **Trang Nền tảng kết nối (D28)** theo prototype: connector registry + port theo năng lực (bank feed, hoá đơn điện tử, ký số, kế toán, TMĐT, sheet, SMS, mail, storage). Phát hành: SePay, Casso (đối soát), SMTP, storage. Connector khác (MISA, Mắt Bão, VNPT, Viettel, EasyInvoice, FPT, KiotViet, Sapo, Haravan, Google Sheets…) hiện thẻ "Sắp có" + "Đăng ký quan tâm". Chuẩn: `standards/integrations/provider-ports.md`. | P0 | Chủ DN | TBD |
| REQ-M03b | Adapter thật cho hoá đơn điện tử (MISA meInvoice / Mắt Bão / VNPT / Viettel), ký số CA, đồng bộ kế toán / TMĐT, Google Sheets, outbound webhook ký HMAC, API key. | P2 | — | TBD |
| REQ-M04 | Phòng ban, Sơ đồ tổ chức, KPI, Phân ca (khi khách lên gói Doanh nghiệp). Vai trò tuỳ biến đã chuyển lên P1 (REQ-A05b). | P3 | — | TBD |
| REQ-M05 | **Cài đặt → Hồ sơ 360°** (mục mới, nhóm Ứng dụng — ver2.1 #7): danh sách mẫu, chip tab, gán vai trò, Chỉnh sửa bố cục · Nhân bản · Xoá, + Tạo mẫu mới, ô *Xem như vai trò*. Thêm vào settings registry (Blueprint §7.2). | P0 | Chủ | TBD (ver2.1) |

### Domain N — Nền tảng & phi chức năng
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-N01 | **Không dùng Docker.** Monorepo: Next.js (web) + NestJS (api + worker). PostgreSQL 16 và Redis cài native (dev: Postgres 16 + Memurai trên Windows; prod: service native hoặc managed); chạy bằng PM2/systemd. | P0 | — | TBD |
| REQ-N02 | Prisma 2 schema (platform + tenant) + migration runner cho mọi DB tenant; partial index, expression index, `INCLUDE` viết bằng SQL thô trong migration; PgBouncer. Query tuân thủ quy tắc index trong CLAUDE.md. | P0 | — | TBD |
| REQ-N03 | API REST `/v1`, OpenAPI tự sinh, cursor pagination, `Idempotency-Key`, lỗi chuẩn hoá. | P0 | — | TBD |
| REQ-N04 | Realtime bằng Socket.IO, room theo workspace / hội thoại; presence và typing. | P0 | — | TBD |
| REQ-N05 | Queue BullMQ + outbox; domain events nội bộ (`message.received`, `order.completed`, `ai.credit_used`…). Consumer idempotent. | P0 | — | TBD |
| REQ-N06 | Bảo mật: JWT ngắn hạn + refresh; mã hoá credential kênh (AES-256); TLS; OWASP Top 10; rate-limit. | P0 | — | TBD |
| REQ-N07 | Hiệu năng: tin nhắn p95 < 1s; API đọc p95 < 300ms. Uptime mục tiêu 99.9%. | P0 | — | TBD |
| REQ-N08 | Backup Postgres (PITR / dump hằng ngày); RPO ≤ 5 phút, RTO ≤ 1 giờ; quyền bị lãng quên (ẩn danh hoá). | P1 | — | TBD |
| REQ-N09 | Observability native trên VPS: **Prometheus + Alertmanager + Grafana + Loki** (Alloy thu log); exporters hệ thống/PG/Redis/nginx/uptime; app metrics (API, queue, kênh, AI, credit); log JSON có `traceId`; dashboard và cảnh báo (email + Telegram) khai báo trong repo. | P0 | — | TBD |
| REQ-N10 | UI tiếng Việt mặc định với lớp i18n (next-intl + ICU), phát hành `vi` + `en`, registry sẵn 11 ngôn ngữ để bật dần (D22). **Ant Design v6**, một codebase cho desktop (chuẩn 1440px) và **mobile web responsive**. Đủ 5 trạng thái UI. WCAG AA. | P0 | — | TBD |
| REQ-N14 | **Parity UI với prototype < 5%:** mỗi màn và trạng thái chính ở 1440×900 sai khác điểm ảnh < 5% so với `AppChat.dc.html` (Playwright screenshot, dữ liệu seed giống prototype). Ngoại lệ chỉ gồm các module và kênh ngoài phạm vi. | P0 | Chủ DN | TBD |
| REQ-N11 | Test: unit (business rules), integration, e2e Playwright cho luồng chính, test cô lập tenant (DB riêng), AI eval set cho Trợ lý (chọn đúng action, đúng tham số, đúng quyền, đúng mức xác nhận) và cho các agent trực kênh. | P0 | — | TBD |
| REQ-N12 | File: BE ≤ 600 dòng, FE ≤ 400 dòng; test để file riêng; commit kèm SHA. | P0 | — | TBD |
| REQ-N13 | **Definition of Done "Action-first":** mọi tính năng mới phải đăng ký action trong Registry (schema, quyền, rủi ro, hoàn tác) và có test gọi action đó **qua Trợ lý AI**. Chưa làm được hai việc này thì tính năng chưa xong. | P0 | — | TBD |
| REQ-N15 | **Nút "Trợ lý AI" một kiểu toàn app** (ver2.1 #13): primitive `AiButton` ở `packages/ui` (nền mực, ✦ xanh brand, "Trợ lý AI", tên module trong tooltip — "Đề nghị thanh toán" thay "Hóa đơn"); thay mọi biến thể cục bộ; bỏ ở màn ẩn (D07, D19). | P0 | Member | TBD (ver2.1) |

---

## AUTO-ANSWERED (from Scan Report)

- **Khách mục tiêu:** doanh nghiệp dịch vụ có khách quay lại; không làm TMĐT; taxonomy 10 nhóm ngành.
- **Tenant:** ~~shared DB + RLS~~ → **DB riêng mỗi workspace** (D21); billing / credit tách riêng theo workspace (BR-08), lưu ở DB nền tảng.
- **Đơn vị tính phí:** Credit (1 credit = 10 token cũ); ẩn tên model với khách.
- **Trial:** Cá nhân Pro 15 ngày, 10.000 credit; hết hạn hạ về Miễn phí, thông báo đóng được.
- **Luồng bán hàng:** báo giá → đơn → hoá đơn → điểm loyalty; pipeline tự cập nhật.
- **Ngưỡng AI:** tự xử khi tin cậy ≥ 70%; HITL với việc chạm tiền, gửi hàng loạt, hợp đồng; Trợ lý không thực thi khi chưa xác nhận.
- **Platform:** desktop web (chuẩn 1440px) + mobile web responsive (D18); không native mobile / PWA; không SMS OTP.
- **Design tokens:** Plus Jakarta Sans; primary #2DC56A (bộ token cuối cùng chốt ở Vision — R17).
- **Prototype** (`docs/06-prototype/AppChat.dc.html` mới nhất; source JSX ở `docs/06-prototype/jsx-reference`) là chuẩn UI và nhãn tiếng Việt.

## APPLICABLE STANDARDS (from coding-packs/standards/)

Xem `standards/README.md` (14 standard, sinh 2026-10-28). Các standard trực tiếp chi phối RRI:
- [authz/rbac-permissions](standards/authz/rbac-permissions.md) — REQ-A05, A05b (D27)
- [integrations/provider-ports](standards/integrations/provider-ports.md) — REQ-M03, M03b, L04, F-hoá đơn (D28)
- [channels/omnichannel-adapter](standards/channels/omnichannel-adapter.md) — REQ-B*
- [ui/prototype-parity](standards/ui/prototype-parity.md) — REQ-N14
- [actions/action-registry](standards/actions/action-registry.md), [ai/agent-gateway](standards/ai/agent-gateway.md), [ai/eval](standards/ai/eval.md) — REQ-D/E, N11

## DECISIONS LOG
| # | Decision | Options | Chosen | Rationale |
|---|---|---|---|---|
| D01 | Hình thái phát hành | MVP thu hẹp / sản phẩm đầy đủ | **Sản phẩm thương mại hoàn chỉnh, không gọi là MVP** | Chủ nhà chốt 2026-10-28 |
| D02 | Mô hình | — | **OPC: 1 chủ + đội AI Agents** | Chủ nhà nhắc lại |
| D03 | Lõi sản phẩm | agent bán hàng / orchestrator + copilot | **Trợ lý AI = Orchestrator điều phối các AI Agent + Copilot điều khiển mọi action trên UI.** Agent bán hàng chỉ là một trong các agent chuyên trách. Các màn khác hiển thị việc AI đã làm. | Chủ nhà chốt và đính chính 2026-10-28 |
| D16 | Kiến trúc thực thi | UI và AI gọi hai đường riêng / dùng chung | **Action-first: một Action Registry dùng chung** cho UI, Trợ lý và agents (schema, quyền, rủi ro, xác nhận, hoàn tác) | Hệ quả bắt buộc của D03: Trợ lý phải làm được mọi thao tác UI mà không viết logic hai lần |
| D04 | Kênh khi phát hành | Zalo OA / FB / Zalo cá nhân / Web / Email | **Zalo cá nhân + Web widget + Email** | Chủ nhà chọn |
| D05 | Zalo cá nhân (API không chính thức) | làm / thay bằng OA / cả hai | **Làm, chấp nhận rủi ro**; adapter cô lập, có throttle chống khoá | Chủ nhà chốt |
| D06 | Quyền tự chủ của agent | theo spec / mọi thao tác ghi cần duyệt / tự chủ tối đa | **Theo spec** (≥70%, ép duyệt khi chạm tiền / hợp đồng / gửi hàng loạt) | Chủ nhà chọn |
| D07 | Module chưa làm | — | **Call Center, Workflow engine** | Chủ nhà chốt |
| D08 | Module phụ khi phát hành | — | **Ticket/SLA, Marketing broadcast, Loyalty** (cùng CRM, Lịch hẹn, Billing, Cài đặt). ~~Báo cáo~~ loại bỏ 2026-10-28 (D19) | Chủ nhà chọn |
| D09 | Hết credit | chặn / chuyển model rẻ / trả sau, khoá ở 5tr | **Chặn AI + popup nạp**, cảnh báo 80%, dữ liệu vẫn dùng | Chủ nhà chọn |
| D10 | Bảng giá | chốt số / cấu hình được | **Lưu DB, cấu hình được**, seed theo prototype | Chủ nhà chọn |
| D11 | RBAC | 4 vai trò / 7 vai trò / Owner + Member | ~~Owner + Member~~ → **thay bằng D27** | Ban đầu theo mô hình OPC |
| D12 | Hạ tầng | Docker / native | **Không dùng Docker**; Next + Nest; Postgres + Redis native | Chủ nhà chốt |
| D13 | ORM | Prisma / Drizzle / TypeORM | **Prisma** (+ SQL thô cho index nâng cao) | Chủ nhà chọn |
| D14 | LLM | Claude / đa nhà cung cấp / gateway | **Đa nhà cung cấp** (LLM Router) | Chủ nhà chọn |
| D17 | Agent runtime & phối hợp agent | fork OpenFang/OpenClaw/Hermes / Mastra / AI SDK + lớp nối tự viết; có / không swarm | **AI SDK v7 + lớp nối tự viết; không swarm** (giữ orchestrator, handoff, hỏi ý, tác vụ tự chủ) | Chủ nhà chốt 2026-10-28; xem Vision V3–V4 |
| D19 | Module Báo cáo | giữ 6 trang / bỏ | **Bỏ khỏi phạm vi.** Số liệu chỉ hiện ở Tổng quan, Hiệu suất agent (REQ-D14), thống kê chiến dịch (REQ-I05), KPI Ticket (REQ-H04) và truy vấn qua Trợ lý AI (REQ-E07) | Chủ nhà chốt 2026-10-28: không có trong prototype hiện hành và docs mới |
| D20 | Hạ tầng production | cloud managed / Docker / native VPS | **Native trên VPS Linux** (systemd + PM2, nginx, PG16, Redis), monitoring **Prometheus + Grafana + Loki** trên VPS riêng, backup pgBackRest offsite | Chủ nhà chốt 2026-10-28 |
| D21 | Mô hình tenant | shared DB + RLS / schema riêng / **database riêng** | **Mỗi workspace một database riêng (`CREATE DATABASE`) + DB nền tảng**; ví credit và hoá đơn gói ở DB nền tảng | Chủ nhà chốt 2026-10-28 |
| D25 | Hợp đồng | P2 / **P0** | **P0**: tuỳ chọn sau báo giá; Owner duyệt + ký trước; khách ký điện tử (OTP + ký tay, lưu vết); ký số CA P2 | Chủ nhà chốt 2026-10-28 |
| D26 | Phạm vi prod đợt đầu | chỉ P0 / **P0 + P1** | **Toàn bộ P0 + P1** của ma trận (màn và domain liệt kê ở Scope Boundaries), build theo pha, phát hành khi đủ | Chủ nhà chốt 2026-10-28 ("không MVP") |
| D24 | Luồng nghiệp vụ Commerce | — | **Chốt toàn bộ theo `plans/COMMERCE-DECISIONS.md`** (Q1–Q8, 8b, 9a, 9b + mặc định): điểm 10.000đ, đề nghị thanh toán (e-invoice P2), đối soát tay + SePay/Casso, báo giá 15 ngày từ lúc gửi, agent giảm tối đa 5%, cọc / một phần, liệu trình, tồn kho, báo giá → đơn bằng nút, lịch hẹn → đơn chỉ gợi ý, bước cuối "Hoàn tất", chờ cọc chỉ cho đơn cần cọc | Chủ nhà chốt 2026-10-28 |
| D23 | Workspace không hoạt động | giữ DB mãi / tự lưu trữ | **Tự lưu trữ gói Miễn phí sau 90 ngày không hoạt động** (dump + drop, khôi phục khi đăng nhập; trả phí/trial không áp dụng; bản lưu trữ không tự xoá) | Chủ nhà đồng ý 2026-10-28; giảm số DB trên cluster (rủi ro K7) |
| D22 | i18n khi phát hành | vi + en / đủ 11 ngôn ngữ | **vi + en**, registry 11 ngôn ngữ để bật dần bằng file bản dịch | Chủ nhà chọn A 2026-10-28 |
| D18 | UI kit & nền tảng hiển thị | Tailwind + shadcn / antd + antd-mobile / antd một codebase | **Ant Design v6 + Ant Design X, một codebase responsive desktop + mobile web; token theo prototype; parity < 5%** | Chủ nhà chốt 2026-10-28 |
| D27 | Phân quyền | Owner + Member / vai trò cố định / **permission + vai trò mặc định + phạm vi dữ liệu** | **Permission engine; 5 vai trò mặc định (Chủ sở hữu, Quản lý, Sales, CSKH, Kế toán); scope Của tôi / Nhóm / Tất cả; AI chạy theo quyền người ra lệnh; vai trò tuỳ biến + Nhóm ở P1** | Chủ nhà chốt 2026-10-28: nhiều sales / CSKH cùng tham gia; thay D11 |
| D28 | Kết nối bên thứ 3 | ẩn trang / chỉ connector có thật / **bật trang + thẻ "Sắp có"** | **Bật Cài đặt → Nền tảng kết nối ở P0**, connector registry + port theo năng lực; SePay / Casso / SMTP / storage phát hành, còn lại "Sắp có" | Chủ nhà chốt 2026-10-28: chừa sẵn MISA, Mắt Bão, VNPT, Viettel… |
| D29 | RAG · Hồ sơ agent · Tạo agent | — | **RAG:** kho thư mục + thẻ, public/internal, agent nhận theo phạm vi, hybrid search + ngưỡng căn cứ + trích nguồn, giá/tồn qua tool; học từ hội thoại **có người duyệt** (P1). **Hồ sơ:** đủ trường builder prototype, bản nháp/xuất bản có phiên bản, chat thử giả lập, **ẩn tên model** (chỉ mức AI). **Tạo:** thủ công · mẫu · Trợ lý AI; Trợ lý **được tạo và xuất bản luôn sau một lần người dùng xác nhận** (preview đủ cấu hình); không tạo agent tạm. Toàn bộ lời gọi model dùng AI SDK | Chủ nhà chốt 2026-10-28 |
| D30 | Mẫu chứng từ + AI soạn | chỉ mẫu hệ thống / **mẫu rich + DOCX của DN** | **Mẫu rich hoặc DOCX của DN** (AI nhận diện biến, người xác nhận; PDF qua LibreOffice headless native); AI soạn báo giá / hợp đồng từ nội dung, số liệu luôn từ bản ghi, điều khoản mẫu nguyên văn, bảng kiểm Điều 398 cảnh báo | Chủ nhà chốt 2026-10-28 |
| D31 | Đồng bộ đơn sàn / POS | không / **chừa khung** | **Port `OrderSyncProvider` + thẻ "Sắp có"**; đơn sàn khoá hàng / giá, thu "qua sàn", tồn chuẩn theo kết nối, **tích điểm đơn sàn mặc định tắt** | Chủ nhà chốt 2026-10-28 |
| D32 | Nhiều sales chăm một khách | nhiều chủ ngang hàng / **1 chính + đồng phụ trách** | **1 chính + đồng phụ trách / theo dõi**; chống giành khách + xin chia sẻ; chuyển phụ trách chỉ Quản lý; chia lead tự động P1 | Chủ nhà chốt 2026-10-28 |
| D33 | Nguồn LLM | chỉ provider gốc / **provider gốc + router OpenAI-compatible** | **Cả hai.** Provider gốc qua `@ai-sdk/*`; router (OpenRouter, 9router, LiteLLM, vLLM, …) qua `@ai-sdk/openai-compatible` khai báo trong bảng `llm_provider` (base URL, key mã hoá, header, khả năng); `model_route` trỏ tới provider bất kỳ; embedding mặc định `text-embedding-3-small` 1536 chiều (qua OpenAI hoặc router hỗ trợ embeddings) | Chủ nhà chốt 2026-10-28 |
| D34 | Email hệ thống | SMTP / SES / **Brevo** | **Brevo** (API transactional, domain riêng SPF / DKIM / DMARC) qua `MailProvider`; SMTP giữ làm adapter dự phòng | Chủ nhà chốt 2026-10-28 |
| D35 | Mặc định vận hành | — | Eval: an toàn / quyền 100%, chọn action ≥ 95% (2/3 lần), rubric ≥ 90%. Uỷ quyền ký hợp đồng / duyệt hoàn tiền cho Quản lý mặc định **tắt**. Zalo cá nhân 200 tin chủ động / ngày / tài khoản, jitter 2–6s, chỉnh được kèm cảnh báo. Đối soát: SePay chính, Casso dự phòng. Tra MST: VietQR. Dev: pgvector native Windows + LibreOffice | Chủ nhà đồng ý theo đề xuất 2026-10-28 |
| D36 | Duyệt Blueprint | — | **Blueprint đã duyệt** (sau rà soát D27–D35); Task Graph 46 TIP / 9 wave và Builder Handoff sinh từ bản này | Chủ nhà duyệt 2026-10-28 |
| D37 | MCP | làm ngay (server / client) / **chừa đường** | **Không làm ở bản phát hành.** Orchestrator + copilot + multi-agent chạy hoàn toàn bằng AI SDK + Action Registry nội bộ. Chừa đường P2: (a) MCP server = adapter mỏng trên Action Registry (`@modelcontextprotocol/sdk`, nguồn `mcp`, OAuth); (b) MCP client = tool ngoài qua `@ai-sdk/mcp` cấp cho agent như connector | Chủ nhà chốt 2026-10-28 |
| D38 | Thứ tự build frontend | FE đi cùng từng TIP backend / **FE theo prototype trước, mock transport** | **Goal `fe-prototype`**: dựng toàn bộ `apps/web` theo prototype (parity < 5%, mobile 390) với mock transport đúng contract Blueprint (`coding-packs/goals/GOAL-FE-PROTOTYPE.md`); TIP UI trong Task Graph (007, 008, 011, 013, 024–026, phần UI của 012, 020, 027–033, 034, 036–039) chuyển thành *nối `httpTransport` + e2e* | Chủ nhà chốt 2026-10-28 |
| D39 | Phạm vi test | chạy toàn bộ mỗi lần / **chỉ phần bị ảnh hưởng** | **Chỉ test phần bị ảnh hưởng** (package đổi + phụ thuộc, parity của màn sửa, e2e của module sửa); sửa lớp dùng chung thì thêm parity các màn đã đạt; chạy toàn bộ chỉ ở cuối pha / wave, trước merge `main`, gate cuối | Chủ nhà chốt 2026-10-28 — tránh mất thời gian |
| D40 | Git flow & CI | PR thẳng vào main / **dev làm nhánh tích hợp** | **Nhánh việc → PR chỉ vào `dev`; `dev → main` Chủ nhà tự tạo và merge**; agent không tự merge, không đụng `main`; GitHub Actions: `ci` (affected), `parity`, `e2e`, `full` (PR vào main + đêm), `backend-it`; branch protection cho dev / main | Chủ nhà chốt 2026-10-28 |
| D41 | Thang token UI (D-TOKEN) | copy nguyên giá trị lẻ của prototype / **chuẩn hoá thang đều** | **Token là thang đều; giá trị prototype snap về bậc gần nhất.** Cỡ chữ 10 (nhãn rail) / 11 / 12 / 13 / 14 / 15 / 16 / 18 / 20 / 22 / 24 / 28 / 32 / 36 / 48. Bo góc 4 / 6 / 8 / 10 / 12 / 16 / 20 / pill. Một màu viền. Spacing bội 4. Parity vẫn ≤ 0.05; màn vượt → escalation L2 (không tự nới). | Chủ nhà 2026-10-28: prototype "chưa đồng bộ, chưa đều" (nhiều cỡ chữ / bo góc gần trùng như 12.1 / 12.4 / 12.7…, 2 màu viền) |
| D42 | Bảng danh sách: cuộn + phân trang | cuộn cả màn, không phân trang / cuộn vô hạn theo cursor / **số trang như prototype** | **Màn danh sách cao đúng viewport, chỉ thân bảng cuộn, header dính; footer `Pager` có số trang + 20/50/100 dòng; API list nhận `page` + `limit`, backend offset + deferred join** (ngoại lệ “bảng có số trang” của response-envelope) | Chủ nhà 2026-10-29: bảng dài đẩy cả màn cuộn, tiêu đề / lọc trôi mất; prototype có footer số trang |
| D43 | Giữ D42 khi cập nhật prototype (ver2.1 trở đi) | theo prototype mới / **giữ hành vi D42** | **Bản prototype mới (ver2.1 và các bản sau) không ghi đè hành vi bảng danh sách D42** ở 9 bảng: Khách hàng, Sản phẩm, Báo giá, Đơn hàng, Đề nghị thanh toán, Hợp đồng, Hỗ trợ, Marketing, thành viên Khách thân thiết. Giữ: (1) màn cao đúng viewport, chỉ thân bảng cuộn; (2) header bảng dính; (3) footer `Pager` có số trang + 20 / 50 / 100 dòng; (4) đổi lọc → về trang 1; (5) API `page` + `limit` → `meta.total`. Prototype mới chỉ được đổi **nội dung** bảng (cột, nhãn, màu, dữ liệu mẫu). Bảng mới thêm trong prototype mới dùng cùng `DataTable` + `ListPager`. Muốn bỏ hành vi này phải có quyết định mới của Chủ nhà | Chủ nhà 2026-10-29: sắp có prototype ver2.1, giữ fix DataTable vừa sửa |
| D44 | Thang token khi cập nhật prototype | theo kích thước mới của ver2.1 / **chuẩn hoá ver2.1 về D41** | **Mỗi bản prototype mới chạy `tools/scripts/normalize-prototype.mjs` trước khi commit làm chuẩn so pixel; thang D41 giữ nguyên.** Đo 2026-10-29: chép nguyên ver2.1 thì 43/109 PASS, chuẩn hoá thì 102/109 (7 màn lệch do tính năng mới) | Chủ nhà 2026-10-29 (RRI ver2.1) |
| D45 | Phạm vi đợt ver2.1 | chọn lọc / **cả 4 nhóm** | **Hộp thư · Hồ sơ 360° · AI Agent · Kênh + nút Trợ lý AI** (REQ-B09–B11, C09–C13, D16, E14, F11–F12, M05, N20); mục 11 (thanh nổi) đã hoàn tác ở prototype → không làm; mục 12 đã xong (D42 / D43) | Chủ nhà 2026-10-29 |
| D46 | Hồ sơ 360° mở form với báo giá / hợp đồng đã gửi | sửa tại chỗ như prototype / **giữ luật COMMERCE** | **Nháp → Cập nhật; báo giá đã gửi → Tạo phiên bản mới (`quote.request_revision`); hợp đồng đã gửi ký → mở chi tiết, không sửa; chưa có → Tạo mới.** Prototype ver2.1 vẽ "Cập nhật BG-2041 (Đã gửi)" — ngoại lệ có mã D46 | Chủ nhà 2026-10-29 |
| D47 | Danh mục công cụ của Agent (Skills / Nền tảng kết nối / Tiện ích) | công cụ ngoài kiểu plugin / **ánh xạ Action Registry + connector manifest** | **Mỗi mục là một action id (Skills / Tiện ích) hoặc một connector có manifest (Nền tảng kết nối); mục ngoài manifest (ZBS, Misa, KiotViet, Sapo, Haravan, WooCommerce, Odoo, Fast, Google Sheets) hiện "Sắp có"; không thêm plugin / MCP (D37 để P2)** | Suy ra từ D16, D28, D37; Chủ nhà duyệt phạm vi 2026-10-29 |
| D48 | Research / Web search trong menu ＋ | làm thật / ẩn / **hiện "Sắp có"** | **Giữ dòng, khoá + nhãn "Sắp có"; không thêm thư viện; làm thật ở P2 cùng MCP** | Chủ nhà 2026-10-29 |
| D49 | Vòng đời trong menu ⋯ hội thoại | đổi enum theo prototype (6 giai đoạn) / **dùng enum hiện có** | **Submenu Vòng đời liệt kê đúng `contact.stage` của màn Khách hàng (`contact.set_stage`)** — một nguồn, khớp Kanban và tab giai đoạn | Chủ nhà 2026-10-29 |
| D50 | Ẩn trò chuyện / Tạo nhóm (Zalo) | làm cả hai / bỏ / **Ẩn làm, Tạo nhóm "Sắp có"** | **Ẩn trò chuyện = `conversation.hidden_at` (không hiện ở danh sách, có tin mới thì hiện lại); Tạo nhóm Zalo khoá "Sắp có" đến TIP-014 (kênh thật)** | Chủ nhà 2026-10-29 |
| D15 | Queue / Search / OLAP | Kafka, OpenSearch, ClickHouse / nhẹ hơn | **BullMQ + outbox, Postgres FTS (unaccent + pg_trgm)** | Chủ nhà đồng ý dùng Next + Nest tối giản, không thêm hạ tầng nặng |

## OPEN QUESTIONS
| # | Question | Impact | Suggested Resolution |
|---|---|---|---|
| OQ-01 | ~~**Agent runtime:** tự xây trong Nest hay nhúng OpenFang?~~ **ĐÃ GIẢI 2026-10-28 → D17 / Vision V3.** | Lớp điều phối và thực thi agent (D01, E04). Action Registry (E01) **vẫn do AppChat sở hữu** dù chọn phương án nào; OpenFang (nếu dùng) gọi Registry qua MCP. | Thiết kế **Agent Gateway interface** ngay từ đầu; triển khai mặc định là agent loop tự viết (TS, tool-use đa provider). Chốt OpenFang ở Vision sau khi spike 1–2 ngày. |
| OQ-02 | ~~Gửi OTP đăng nhập qua kênh nào?~~ **ĐÃ GIẢI 2026-10-28:** Email OTP (qua Brevo — D34) + mật khẩu; Zalo OTP qua ZNS khi có OA (P2). | REQ-A01 | — |
| OQ-03 | Thư viện Zalo cá nhân (ví dụ `zca-js`, Node) và chính sách giới hạn gửi | REQ-B02/B04, I03 | Spike kỹ thuật ở Blueprint; tham số throttle cấu hình được. |
| OQ-04 | Webhook ngân hàng: **chốt SePay chính, Casso dự phòng** (2026-10-28). Còn chờ: tài khoản SePay + tài khoản nhận tiền của AppChat. Dev dùng `mock`. | REQ-L04 | Chủ nhà cấp trước khi TIP thanh toán chạy thật. |
| OQ-05 | ~~API tra cứu MST~~ **ĐÃ GIẢI 2026-10-28:** API tra MST của VietQR (miễn phí) qua `TaxLookupProvider`; lỗi thì nhập tay. | REQ-A02 | — |
| OQ-06 | Khoá LLM: **hỗ trợ provider gốc (Anthropic, OpenAI, Google, DeepSeek) và mọi router OpenAI-compatible (OpenRouter, 9router, …) — D33**. Còn chờ: khoá thật (tối thiểu 1 router hoặc Anthropic + OpenAI) và bảng đơn giá credit. | REQ-D02, L01 | Chủ nhà cấp trước TIP AI; đơn giá lưu DB. |
| OQ-07 | Hạ tầng production: **native VPS + Prometheus/Grafana/Loki (D20)**; email hệ thống = **Brevo (D34)**; backup offsite = object storage S3-compatible ở nhà cung cấp khác VPS. **Hoãn (Chủ nhà chưa quan tâm):** nhà cung cấp / vị trí VPS, domain. | REQ-N01, N08, N09 | Chủ nhà chốt trước deploy lần đầu |
| OQ-08 | ~~Bộ design token cuối cùng~~ **ĐÃ GIẢI → V11:** token từ `styles.css` của prototype. | REQ-N10 | — |
| OQ-09 | Tài khoản Zalo cá nhân phụ để spike `zca-js` (OQ-03) | REQ-B02/B04 | Chủ nhà cấp 1–2 tài khoản phụ (không dùng tài khoản chính). |
| OQ-10 | Đăng ký app đối tác Shopee / TikTok Shop / Lazada (K9) | REQ-F07b (adapter P2) | Chủ nhà nộp sớm; không chặn phát hành. |
| OQ-11 | Permission cho Cài đặt → Hồ sơ 360° (`settings.manage` hay `crm.fields_manage`) và nơi lưu mẫu (bảng `profile_layout` hay `workspace.settings`) | REQ-F12, M05 | Đề xuất: `settings.manage`, bảng `profile_layout` (tenant DB). Chủ thầu chốt khi cập nhật Blueprint §2 / §3.4, trước TIP ver2.1. |
| OQ-12 | Cảm xúc tin nhắn chỉ hiện ở kênh nào (Zalo cá nhân có; Email không; Webchat?) | REQ-C09 | Đề xuất: Zalo cá nhân + Webchat; khai báo trong channel manifest (`capabilities.reactions`). Chủ thầu chốt khi viết TIP Hộp thư. |

## SCOPE BOUNDARIES

### In Scope (bản phát hành thương mại đầu tiên)
- **Identity / Workspace / Trial / Phân quyền:** đăng ký và đăng nhập, khai báo DN bắt buộc, workspace với DB riêng, trial 15 ngày, phân quyền theo permission + 5 vai trò mặc định + phạm vi dữ liệu (D27); vai trò tuỳ biến + Nhóm (P1).
- **Kênh:**
  - Zalo cá nhân (1-1 và nhóm).
  - Web Live Chat widget.
  - Email.
- **Inbox realtime:** 3 cột, chế độ AI theo từng hội thoại, folder views riêng cho AI.
- **Trợ lý AI (lõi): Orchestrator + Copilot.**
  - Action Registry phủ mọi thao tác UI; Trợ lý điều khiển toàn bộ nền tảng với quyền của người ra lệnh.
  - Xác nhận theo mức rủi ro; điều phối agents; điều khiển UI (điều hướng, điền form, lọc).
  - Có mặt ở mọi màn; truy vấn số liệu bằng ngôn ngữ tự nhiên; nhật ký và hoàn tác.
- **AI Agents chuyên trách:**
  - Sales, CSKH, Booking, Marketing, Kế toán, Vận hành.
  - Trực kênh; tools lấy từ Registry; RAG.
  - HITL và hàng chờ duyệt; chuyển việc giữa các agent (A2A).
  - Builder agent; LLM Router đa nhà cung cấp; follow-up chủ động.
- **CRM & bán hàng:** Khách hàng, Hồ sơ 360°, Sản phẩm (biến thể, kho), Báo giá, **Hợp đồng + ký điện tử**, Đơn, Đề nghị thanh toán + thu tiền QR / SePay-Casso, Liệu trình.
- **Lịch hẹn:** chống trùng lịch, nhắc hẹn.
- **Hỗ trợ:** Ticket/SLA (chính sách mặc định).
- **Marketing broadcast:** AI đề xuất, gửi qua Zalo cá nhân và Email, bắt buộc duyệt.
- **Loyalty:** hạng, tích và đổi điểm tự động.
- **Tổng quan.**
- **Gói / Credit / VietQR:** cùng trang quản trị nền tảng.
- **Cài đặt:** Tổng quan workspace (+ giờ làm việc) · Ngôn ngữ · Thành viên · Kênh kết nối · Web widget · Trường dữ liệu · Thẻ · Câu trả lời mẫu · Mẫu hợp đồng · Vai trò & phân quyền · Nền tảng kết nối (D28) · AI Models · Dữ liệu RAG · AI Governance · Nhật ký AI / Audit · SLA mặc định · Thông báo · Ví & gói.
- **Danh sách màn chi tiết + thứ tự build:** `RRI-GOAL-*.md` và `02-TASK-GRAPH.md` (D26).

### Out of Scope (hoãn)
- Call Center / AI Voice / WebPhone.
- Module Báo cáo (10 trang / 5 nhóm, xuất Excel, báo cáo lên lịch, AI narrative) — D19.
- Workflow engine và builder.
- Zalo OA / ZNS, Facebook, Instagram, WhatsApp, Telegram, TikTok (P2).
- Ký số CA cho hợp đồng (P2; ký điện tử của AppChat đã IN — D25).
- Swarm: các agent tự bàn và tự chia việc mà không có đầu mối (D17). Handoff và hỏi ý giữa agent vẫn nằm trong phạm vi (REQ-D13).
- Phòng ban, sơ đồ tổ chức, KPI, phân ca, SLA đa chính sách (P3).
- Adapter thật cho hoá đơn điện tử / ký số CA / kế toán / TMĐT / Sheets (P2 — thẻ "Sắp có" đã IN, D28).
- Help Center, Training Studio / canary, Dashboard builder, Template Studio.
- MCP server / MCP client (P2 — đã chừa đường, D37).
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
- **Gaps:** ~~OQ-01 (agent runtime)~~ đã chốt ở D17. OQ-03 và OQ-04 cần spike hoặc thông tin từ Chủ nhà.
- **Đính chính 2026-10-28:** Trợ lý AI là Orchestrator + Copilot, không phải agent bán hàng. Đã viết lại Domain D/E, thêm D16 Action-first và REQ-N13.
- **Confidence trên P0:** khoảng 85%.

### Quality Gate: Self-Review (RRI ver2.1 — 2026-10-29)
- **Nguồn:** Scan delta ver2.1 (`00-PROJECT-CONTEXT.md` → *SCAN DELTA — Prototype ver2.1*) + đo parity thật (43 → 102 / 109 sau chuẩn hoá D41).
- **AUTO-ANSWER:** AA-v21-1…10 (kênh / connector ngoài manifest, D42 / D43, D07, D27, D41) — không hỏi lại.
- **SMART-ASK (P0, 2 lượt):**
  - thang token (D44);
  - COMMERCE với Hồ sơ 360° (D46);
  - phạm vi (D45);
  - Research / Web search (D48);
  - vòng đời (D49);
  - ẩn / tạo nhóm (D50).
- **CHALLENGE-PROPOSE:** D47 (danh mục công cụ ánh xạ Action Registry / manifest) suy ra từ D16 / D28 / D37.
- **REQ mới:** B09–B11, C09–C13, D16, E14, F11–F12, M05, N15 — đều P0, có prototype dòng ver2.1 trong Scan delta.
- **Open questions còn lại:** OQ-11, OQ-12 (P2–P3, Chủ thầu chốt khi viết TIP), không chặn.
- **Confidence trên P0 ver2.1:** ~90%.
- **Còn mở từ trước:** OQ-03 / OQ-09 (zca-js). Chủ nhà báo đã chạy thử không lỗi (2026-10-29) nhưng chưa gửi phiên bản / phạm vi thử → chưa đóng.
