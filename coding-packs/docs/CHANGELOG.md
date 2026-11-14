# CHANGELOG — AppChat

Ghi lại các thay đổi kiến trúc/nghiệp vụ quan trọng để người sau follow được lịch sử.
Định dạng: `## [ngày] — chủ đề` → Lý do · Thay đổi · Ảnh hưởng.

---

## [2026-08-01] — Sửa lỗi 3 trang Cài đặt không hiển thị

**Hiện tượng:** click **Phòng ban**, **Sơ đồ tổ chức**, **Vai trò & phân quyền** → vùng nội dung trắng.

**Nguyên nhân gốc:** khối `setIsChannels` (Kênh kết nối) bị **thiếu thẻ đóng** và trong nhánh kanban của nó lại chứa nhầm nội dung *Danh sách nhân sự* của trang Phòng ban. Hệ quả: mọi section phía sau (Vai trò · Phòng ban · Sơ đồ tổ chức · SLA · KPI…) bị **lồng bên trong** khối Kênh kết nối, nên chỉ hiện khi đang ở trang Kênh kết nối.

**Đã sửa:**
- Gỡ bỏ khối `setIsChannels` hỏng/trùng lặp (bản đúng vẫn giữ nguyên).
- Trả nội dung *Danh sách nhân sự* + phân trang về đúng trang **Phòng ban**, đặt trong nhánh `teamIsList`; lưới thẻ phòng ban đặt trong nhánh `teamIsCards` — nút *Thẻ phòng ban* / *Danh sách nhân sự* nay chuyển đúng chế độ xem.
- Gỡ 2 section trùng lặp hoàn toàn: `setIsGeneral` (Tổng quan) và `setIsMembers` (Thành viên).

**Kết quả:** 54 trang Cài đặt đều ở cấp cao nhất, không còn lồng nhau; mỗi khoá chỉ xuất hiện một lần.

---

## [2026-07-26] — Card ở Trợ lý AI: carousel 4 card/trang, tự chuyển sau 3 giây

- **Tab Chat** — 5 card tư duy hiển thị **4 card/trang**, 2 trang.
- **Tab Cowork** — 6 card AI Agent hiển thị **4 card/trang**, 3 trang (trượt 2 card mỗi lần).
- **Tự chuyển sau 3 giây** (`setInterval` trong `componentDidMount`); chỉ chạy khi đang ở màn Trợ lý AI và chưa có tin nhắn nào (màn welcome), tránh chạy nền vô ích.
- Thêm **nút chuyển tiếp ›** và **dot indicator** ở header mỗi khối — bấm dot nhảy thẳng tới trang đó; màu dot theo tab (xanh brand cho Chat, tím cho Cowork).
- Dọn interval trong `componentWillUnmount`.

---

## [2026-07-26] — Tách nội dung card theo tab Chat / Cowork (Trợ lý AI)

Trước đó cả hai tab hiển thị y hệt nhau (4 card nghiệp vụ + gợi ý). Nay mỗi tab có nội dung riêng theo đúng vai trò.

**Tab Chat — "tư duy"** · 5 card theo dạng công việc trí tuệ:
| Card | Việc |
|---|---|
| Lên ý tưởng | Ý tưởng chiến dịch, nội dung, ưu đãi |
| Lập kế hoạch | Kế hoạch tuần/tháng, phân rã công việc |
| Phân tích &amp; đề xuất | Đọc số liệu → nhận định → khuyến nghị |
| Soạn nội dung | Email, ZNS, kịch bản gọi, bài đăng |
| Ra quyết định | So sánh phương án, chọn hướng |

Bấm card → nạp prompt mẫu vào ô soạn (không thực thi). Khối **"Gợi ý cho bạn"** chỉ hiện ở tab Chat.

**Tab Cowork — "thực thi"** · **6 card AI Agent** thật:
- Sales · CSKH · Marketing · Booking · Kế toán · Vận hành.
- **Card dạng giới thiệu, đồng nhất style với card tab Chat**: icon nền màu → badge trạng thái → tên agent → mô tả → nhãn model.
- **Không có nút Giao việc / Sửa trên card** — bấm vào card chỉ chọn agent đó làm agent thực thi (hiện trên chip composer). Muốn sửa agent đã có thì sang menu **AI Agents**.
- Đã **xoá** dải 4 thẻ chỉ số (Agent đang chạy · Lượt chạy 24h · Tỉ lệ thành công · Token hôm nay) và nút **"Tạo AI Agent mới &amp; cấu hình"** — tạo agent mới thực hiện qua menu ＋.
- Khối **"Gợi ý cho bạn"** hiển thị ở **cả hai tab**, nằm dưới khối card.

---

## [2026-07-26] — Menu Profile: ngôn ngữ thành submenu bay ra bên phải

- Đổi từ dropdown `<select>` sang **dòng menu "Ngôn ngữ ›"** — hover mở **submenu bên phải** (giống mẫu tham chiếu).
- Mỗi dòng: **cờ + tên bản địa kèm quốc gia**, dấu **✓** ở ngôn ngữ đang chọn:
  🇻🇳 Tiếng Việt (Việt Nam) · 🇺🇸 English (United States) · 🇨🇳 简体中文（中国） · 🇭🇰 中文（香港） · 🇹🇼 中文（繁體） · 🇯🇵 日本語（日本） · 🇰🇷 한국어（대한민국） · 🇹🇭 ภาษาไทย (ไทย) · 🇲🇾 Bahasa Melayu (Malaysia) · 🇮🇩 Indonesia (Indonesia) · 🇵🇭 Filipino (Philippines)
- Submenu cuộn được (`max-height:78vh`), chọn xong tự đóng; mặc định **Tiếng Việt**. Lưu vào `ac_lang`.

**Sửa lỗi:** submenu ban đầu không hiện vì panel Profile cha có `overflow` cắt mất phần tử `position:absolute` tràn ngang. Đã đổi sang **`position:fixed`** với toạ độ đo bằng `getBoundingClientRect()` khi hover (cùng cơ chế các flyout sidebar), kèm kẹp biên dưới để submenu không tràn khỏi màn hình.

**Sửa lỗi cờ không render:** emoji cờ (regional-indicator) không có glyph trên một số nền tảng (Windows) nên hiển thị thành chữ "VN", "US"… Đã thay bằng **ảnh cờ thật** 20×14px (`flagcdn.com`) ở submenu Profile và ở tiền tố `+84` màn đăng ký. Riêng `<select>` ngôn ngữ ở footer đăng nhập/đăng ký **không chèn được ảnh vào `<option>`** (giới hạn HTML) nên đã bỏ emoji, chỉ giữ tên bản địa — tránh hiển thị mã chữ trông như lỗi.

---

## [2026-07-26] — Menu Profile: ngôn ngữ dạng cờ + tên bản địa (11 ngôn ngữ)

- Select ngôn ngữ nằm **cùng hàng** với nhãn "Ngôn ngữ" (căn phải, cao 32px).
- Đổi từ dạng viết tắt (VI · EN · MS…) sang **cờ quốc gia + tên bản địa**, bổ sung 简体中文, tổng **11 lựa chọn**:

  🇻🇳 Tiếng Việt · 🇺🇸 English · 🇨🇳 简体中文 · 🇭🇰 中文（香港） · 🇹🇼 中文（繁體） · 🇯🇵 日本語 · 🇰🇷 한국어 · 🇹🇭 ภาษาไทย · 🇲🇾 Bahasa Melayu · 🇮🇩 Bahasa Indonesia · 🇵🇭 Filipino

- Thứ tự nhóm theo khu vực: Việt Nam → Anh/Mỹ → Trung (3 biến thể) → Nhật/Hàn → Thái → Đông Nam Á đảo.
- Cờ English đổi 🇬🇧 → 🇺🇸. Lựa chọn vẫn lưu vào `ac_lang`.

---

## [2026-07-26] — Menu Profile: ngôn ngữ chuyển sang dropdown 10 ngôn ngữ

- Thay 3 chip (Tiếng Việt · English · 中文) bằng **select cùng hàng với nhãn "Ngôn ngữ"** (căn phải, cao 32px), đầy đủ **10 ngôn ngữ** dạng **cờ quốc gia + mã viết tắt**:
  🇻🇳 VI · 🇬🇧 EN · 🇲🇾 MS · 🇹🇭 TH · 🇮🇩 ID · 🇵🇭 PH · 🇯🇵 JA · 🇰🇷 KO · 🇭🇰 HK · 🇹🇼 TW
- Lựa chọn lưu vào `ac_lang` (giữ nguyên cơ chế cũ), đồng bộ với danh sách ngôn ngữ ở màn đăng nhập/đăng ký.

---

## [2026-07-26] — Xoá menu Báo cáo khỏi sidebar

- Gỡ mục **Báo cáo** (và flyout submenu 10 báo cáo: Executive Dashboard · Conversations · Tickets &amp; SLA · …) khỏi sidebar điều hướng.
- Các trang báo cáo và handler (`goReports`, `goRepExec`, …) vẫn còn trong code — chỉ mất lối vào từ sidebar, có thể phục hồi nhanh nếu cần.
- Sidebar còn: Tổng quan · Trợ lý AI · Hộp thư · Khách hàng · Hỗ trợ · Marketing · Lịch hẹn · Gọi điện · AI Agents · Quy trình · Loyalty.

---

## [2026-07-26] — Menu ＋ tab Cowork: Việt hoá nhãn

| Trước | Sau |
|---|---|
| Thêm tệp (Add file) | **Thêm tệp** |
| Kết nối (Connectors) | **Kênh kết nối** |
| Tiện ích (Plugins) | **Nền tảng kết nối** |
| Chọn AI Agent | *giữ nguyên* |
| Tạo AI Agent mới | *giữ nguyên* |

- Bỏ toàn bộ chú thích tiếng Anh trong ngoặc.
- Icon đồng bộ với tab Chat: Kênh kết nối → globe, Nền tảng kết nối → cog.
- Hành vi không đổi: *Chọn AI Agent* mở danh sách agent; *Tạo AI Agent mới* mở builder thủ công của trang AI Agents.

---

## [2026-07-26] — Menu ＋ tab Chat: Việt hoá &amp; bỏ Skills

Danh sách hành động khi bấm **＋** ở tab Chat (Trợ lý AI):

| Trước | Sau |
|---|---|
| Skills | *(đã xoá)* |
| Connectors | **Kênh kết nối** |
| Plugins | **Nền tảng kết nối** |
| Research | **Nghiên cứu** |
| Web search | **Tìm kiếm** |

- Giữ 2 mục đầu: Thêm tệp hoặc hình ảnh (Ctrl+U) · Chụp ảnh màn hình.
- Toàn bộ nhãn nay là tiếng Việt (trước còn lẫn tiếng Anh).
- Icon gắn lại đúng nghĩa: Kênh kết nối → globe, Nền tảng kết nối → cog, Nghiên cứu → search, Tìm kiếm → flow.
- Menu còn **6 mục** (trước 7).

---

## [2026-07-26] — Nội dung trò chuyện: chuyển sang bảng 5 cột

- Danh sách dòng-thẻ đổi thành **bảng có header**, 5 cột: **Tên nội dung · Mô tả · Ngày giờ · Trạng thái · Xem lại**.
- **Tên nội dung** — icon nghiệp vụ + tiêu đề + nhãn nhóm (Marketing/Kinh doanh/CSKH/Vận hành/Phân tích).
- **Ngày giờ** — thời điểm + số tin nhắn ở dòng phụ.
- **Trạng thái** — badge 3 mức: **Đang chạy** (xanh ngọc) · **Hoàn tất** (xanh brand) · **Chờ xử lý** (vàng).
- **Xem lại** — nút ở cột cuối (đổi tên từ "Mở lại"), mở lại phiên trong tab Chat.
- Giữ nguyên bộ lọc phía trên: tìm kiếm · thời gian · đối tượng · model · sắp xếp · chip nhóm nghiệp vụ · Đặt lại.

---

## [2026-07-26] — Kênh kết nối &amp; Tích hợp (Settings): 3 → 4 card/dòng

- Lưới thẻ trong **Settings → Ứng dụng → Kênh kết nối** đổi từ `repeat(3,1fr)` sang **`repeat(4,1fr)`**.
- Áp dụng tương tự cho **Settings → Ứng dụng → Nền tảng kết nối (Tích hợp)** — cùng 4 card/dòng để hai trang đồng nhất.
- Giữ nguyên style thẻ: badge giá/nhãn nổi ở mép trên, logo nền tảng thật, mô tả, đường kẻ phân cách, nút Kết nối.

---

## [2026-07-26] — "Phiên trò chuyện" → "Nội dung trò chuyện" · nâng cấp thành trang danh sách

**Đổi tên** xuyên suốt: sidebar flyout, tab, breadcrumb, tiêu đề trang, panel nhanh → **"Nội dung trò chuyện"**.

**Nâng cấp trang:**
- Bố cục từ **lưới 2 cột thẻ** → **danh sách theo dòng** (list), mỗi dòng full-width: icon nghiệp vụ · tiêu đề + nhãn nhóm · trích đoạn nội dung · thời gian + số tin nhắn · nút **Mở lại**.
- **Bổ sung 3 select mới** cạnh select thời gian:
  - **Đối tượng** — Tất cả · Tôi tạo · Đồng nghiệp · AI Agent tự chạy · Gắn với khách hàng · Gắn với chiến dịch.
  - **Model** — Tất cả · Opus 4.6 · Sonnet 4.5 · Haiku 4.5.
  - **Sắp xếp** — Mới nhất trước · Cũ nhất trước · Nhiều tin nhắn nhất.
- Ô tìm kiếm mở rộng phạm vi: tiêu đề, nội dung, khách hàng.
- Nút **Đặt lại** xoá cả 6 điều kiện lọc (trước chỉ xoá 3).
- Đếm kết quả đổi từ "N phiên" → **"N nội dung"**.

---

## [2026-07-26] — Cowork là chế độ, không phải trang · nối vào builder AI Agent thủ công

**Sửa lỗi điều hướng:** click pill **Cowork** trước đây chuyển hẳn sang trang *"Tác vụ tự chủ (Coworks)"* (danh sách agent) — sai yêu cầu. Nay Cowork là **chế độ (`coworkMode`) trong chính màn Trợ lý AI**: chỉ đổi ngữ cảnh composer, giữ nguyên `active` module và `asstView='chat'`.

**Flow thực thi Cowork (đúng đặc tả):**
```
Tab Cowork  →  ＋  →  ┌ Chọn AI Agent      → danh sách 6 agent → chọn
                      └ Tạo AI Agent mới   → mở BUILDER thủ công (trang AI Agents)
                                             cấu hình đầy đủ → "Lưu tác nhân"
                                             → agent vừa tạo được gán làm agent thực thi
              →  chip Agent + chip Model (Opus 4.6 / Sonnet 4.5 / Haiku 4.5 + Mức nỗ lực)
              →  gửi lệnh → Action
```

- **"Tạo AI Agent mới"** không còn dùng form rút gọn 2 ô — mở đúng **builder thủ công của trang AI Agents** (`agBuilder`), hoàn thiện cấu hình rồi mới nhấn **Lưu**.
- Nút **Lưu tác nhân** trong builder trước đây chỉ đóng màn (`closeAgBuilder`); nay dùng `saveAgBuilder` — nếu builder được mở từ Cowork (`agbFromCowork`) thì tên agent vừa lưu tự trở thành **agent thực thi** hiển thị trên chip.
- Gỡ modal tạo agent rút gọn (dead code sau khi nối builder).
- **Chip agent** hiện cạnh chip model ở cả 3 composer, chỉ hiển thị khi đang ở chế độ Cowork; bấm chip mở lại danh sách chọn agent.

---

## [2026-07-26] — Chat / Cowork trong Trợ lý AI: menu ＋ theo tab + chọn model

**Tên menu:** giữ nguyên **"Trợ lý AI"** (đã thử đổi thành "Chat" rồi hoàn lại theo yêu cầu — sidebar, tiêu đề trang, submenu flyout, breadcrumb đều trả về tên cũ).

**Xoá submenu "Tác vụ tự chủ"** khỏi flyout hover của menu Trợ lý AI — flyout chỉ còn **Phiên trò chuyện · Nhật ký hành động**. Cowork không còn là một lối điều hướng riêng.

**Cowork không điều hướng:** chọn tab Cowork chỉ đổi nội dung **trong màn Trợ lý AI** (`asstView`), không chuyển sang trang AI Agents, không đổi `active` module — vào/ra bằng pill trong composer.

**Hai tab trong cùng một trang** — chuyển tab **không rời màn Trợ lý AI**, không điều hướng sang trang AI Agents:
- **Chat** — lên ý tưởng, trao đổi với AI, sắp xếp công việc.
- **Cowork** — thực thi: AI Agent tự chủ, nhiệm vụ nhiều bước.

**Pill `Chat | Cowork`** hiển thị ở cả 3 khung soạn: welcome, chat đang chạy, và composer mới của tab Cowork → chuyển qua lại được ở mọi trạng thái.

**Nút ＋ đổi nội dung theo tab:**
| Chat | Cowork |
|---|---|
| Thêm tệp hoặc hình ảnh (Ctrl+U) · Chụp ảnh màn hình · Skills · Connectors · Plugins · Research · Web search | Add file · Connectors · Plugins · **Chọn AI Agent** · **Tạo AI Agent mới** |

**Bộ chọn model** (cả 2 tab): chip `Sonnet 4.5 High ⌄` → Opus 4.6 · Sonnet 4.5 · Haiku 4.5 + Mức nỗ lực.

**Sửa lỗi trong quá trình làm:**
- Pill bị nhân bản 3 lần trong cùng một composer (do `String.replace` luôn thay chỗ đầu tiên và anchor được tái tạo) → chuyển sang `split/join`, chèn đúng 1 lần mỗi composer.
- Tab Cowork ban đầu không có composer → không có ＋ và không chọn được model; đã thêm composer riêng cho tab này.
- Popover ＋ / model dùng offset cứng theo viewport (`left:50%` + translateX) nên lệch sang sidebar và che composer → nay neo theo `getBoundingClientRect()` của nút, giống cơ chế flyout sidebar.
- Khối Cowork mang từ Settings sang bị tràn ngang (lưới cố định 6-up / 2-up) → đổi sang `auto-fit/minmax` + `min-width:0`.

---

## [2026-07-25] — Tách Trợ lý AI → Chat thành 2 tab: Chat / Cowork

- Thêm **pill toggle `Chat | Cowork`** ngay trong khung soạn tin (composer) của trang Trợ lý AI — theo mẫu tham chiếu người dùng gửi.
- **Tab Chat**: lên ý tưởng, trao đổi với AI, sắp xếp công việc (giữ nguyên welcome, 4 card nghiệp vụ, carousel, gợi ý nhanh).
- **Tab Cowork**: tab thực thi — AI Agents tự chủ (thống kê, danh sách agent, drawer cấu hình Prompt · Kiến thức · Công cụ · Nhật ký).
- Chuyển đổi ngay tại composer, không cần rời trang; submenu sidebar vẫn có lối vào trực tiếp "Tác vụ tự chủ".

---

## [2026-07-27] — Workflow: bổ sung 25 mẫu & phân trang 20 mẫu/trang

**Thêm 25 quy trình mẫu** (tổng **20 → 45**), phủ đủ 5 nhóm nghiệp vụ:
- **Bán hàng & Doanh thu**: Chốt đơn từ livestream · Upsell sau mua · Báo giá hết hạn · Xin duyệt giá đặc biệt · Theo dõi giao hàng · Đơn huỷ & Hoàn tiền · Nhắc ký hợp đồng · Gia hạn hợp đồng · Chấm điểm lead theo hành vi · Phân bổ lead theo khu vực
- **Chăm sóc & Hỗ trợ**: Ticket quá hạn SLA · Gom ticket trùng · Khảo sát sau xử lý · Nhắc hẹn nhiều chặng · Xử lý no-show
- **Tiếp thị & Giữ chân**: Chào mừng khách VIP · Chuỗi nuôi dưỡng ZNS · A/B test nội dung · Thăng hạng thành viên · Nhắc điểm sắp hết hạn · Win-back khách ngủ đông
- **Tài chính & Kế toán**: Nhắc thanh toán nhiều mức
- **Vận hành & Định tuyến**: Định tuyến theo ngôn ngữ · Cảnh báo bất thường · Đồng bộ đơn về kế toán

**Phân trang**: 20 mẫu/trang (3 trang), thanh `‹ 1 2 3 ›` + dòng *Hiển thị x–y / N mẫu*; mọi thao tác lọc/tìm kiếm reset về trang 1 — đồng bộ với trang AI Agents.

---

## [2026-07-27] — Đổi cỡ trang AI Agents mẫu: 10 → 20 mẫu/trang

- 45 mẫu chia thành **3 trang** (20 · 20 · 5) thay vì 5 trang.
- Dòng thông tin và số trang tự tính lại theo cỡ trang mới.

---

## [2026-07-27] — Bổ sung 20 AI Agent mẫu (phủ đủ mọi phân loại)

Tổng số mẫu **25 → 45**, trải đều 8 nhóm ngành / 19 nghiệp vụ:

- **Bán lẻ & TMĐT**: Tư vấn thời trang · Size · Livestream & Chốt đơn · Săn deal & Khuyến mãi · Xử lý đổi trả & Hoàn tiền
- **Dịch vụ & CSKH**: Trực đêm & Ngoài giờ · Xử lý khiếu nại · Nhắc lịch & Xác nhận hẹn · Bảo hành & Sửa chữa
- **Tiếp thị & Tăng trưởng**: Nội dung mạng xã hội · Email & ZNS Automation · Nuôi dưỡng lead nguội · Ưu đãi sinh nhật & Hạng · Cảnh báo khách rời bỏ
- **Bất động sản**: Tư vấn dự án BĐS
- **Giáo dục**: Chăm sóc học viên
- **F&B & Du lịch**: Đặt bàn & Gọi món · Tư vấn tour & Đặt chỗ
- **Tài chính & Kế toán**: Đối soát thanh toán
- **Vận hành nội bộ**: Onboarding nhân sự mới · Tổng hợp báo cáo tự động

Phân trang tự tính lại: **5 trang** (10 mẫu/trang).

---

## [2026-07-27] — Gộp danh sách AI Agents mẫu về một lưới chung

- Bỏ các tiêu đề nhóm ngành chen giữa lưới; toàn bộ mẫu hiển thị **một lưới tổng hợp 5 cột** để xem nhanh trong một tầm mắt.
- Việc phân loại giữ ở **thanh bộ lọc phía trên** (Nhóm ngành → Ngành cụ thể → AI Agent) — không lặp lại phân loại hai nơi.
- Giữ nguyên phân trang 10 mẫu/trang và hành vi reset trang khi lọc.

---

## [2026-07-27] — Phân trang cho AI Agents mẫu

- Danh sách 25 mẫu chia **10 mẫu/trang** (3 trang), vẫn giữ cách gom nhóm theo nhóm ngành trong từng trang.
- Thanh phân trang cuối danh sách: thông tin *Hiển thị x–y / N mẫu* + nút ‹ · số trang · ›, trang hiện tại tô màu brand.
- Mọi thao tác **tìm kiếm / lọc phân cấp / xoá lọc** đều reset về trang 1; tổng số trang tính lại theo kết quả lọc.

---

## [2026-07-27] — Bổ sung 5 AI Agent mẫu & phân loại theo nhóm ngành

**Thêm 5 mẫu mới** (tổng 25):
- Vận đơn & Giao hàng *(Đơn hàng)* · Thu hồi công nợ *(Kế toán)* · Chăm sóc sau bán *(Giữ chân)* · Tuyển sinh & Tư vấn khoá học *(Giáo dục)* · Điều phối tổng đài *(Gọi điện)*.

**Phân loại trên trang AI Agents**:
- Lưới phẳng 25 mẫu → **gom nhóm theo nhóm ngành**, mỗi nhóm có tiêu đề + đếm số mẫu + đường kẻ phân cách.
- 8 nhóm: Bán lẻ & TMĐT · Dịch vụ & CSKH · Tiếp thị & Tăng trưởng · Bất động sản · Giáo dục · F&B & Du lịch · Tài chính & Kế toán · Vận hành nội bộ.
- Nhóm chỉ hiện khi có mẫu khớp bộ lọc, nên tìm kiếm / lọc phân cấp vẫn hoạt động và tự thu gọn danh sách nhóm.

---

## [2026-07-26] — Bổ sung 25 mẫu quy trình & xác nhận phân trang 20 mẫu/trang

- Thư viện **Quy trình mẫu** tăng từ 45 → **70 mẫu**, phủ đủ 5 nhóm nghiệp vụ.
- 25 mẫu mới trải đều: Onboarding (2), Bán hàng (3), Báo giá (2), Đơn hàng (3), Hợp đồng (2), Lead (2), Hỗ trợ (2), CSKH (2), Lịch hẹn (2), Marketing (2), Loyalty (1), Giữ chân (1), Tích hợp (1).
- Phân trang giữ **20 mẫu/trang** (đã có sẵn) → nay 4 trang; bộ lọc phân cấp và tìm kiếm hoạt động trên toàn bộ 70 mẫu.

---

## [2026-07-28] — Chuẩn hoá mô hình định giá về **một đơn vị Credit**

**Vấn đề:** hệ thống đang chạy 2 đơn vị song song — bảng gói ghi *"token AI / tháng"* trong khi Ví bán *Credit*; khách phải tự quy đổi. Ngoài ra Ví có 2 tab cùng bán tài nguyên tiêu hao.

**1 · Thống nhất đơn vị Credit** (tỉ lệ 1 credit = 10 token cũ)

| Gói | Trước | Sau |
|---|---|---|
| Miễn phí | 5.000 token | **500 credit** |
| Cá nhân | 30.000 token | **3.000 credit** |
| Cá nhân Pro | 100.000 token | **10.000 credit** |
| Cá nhân Max | 250.000 token | **25.000 credit** |
| Team / Business / Ultimate | 200K / 500K / 2M token | **20.000 / 50.000 / 200.000 credit** |

Áp cho cả: bảng gói cá nhân & doanh nghiệp (2 bộ), ma trận so sánh chi tiết, thẻ addon, tiêu đề trang Settings và mục sidebar.

**2 · Ẩn chi tiết kỹ thuật khỏi khách hàng**
- Bỏ dòng *"1.000₫ ≈ 333 token Haiku / 111 Sonnet / 33 Opus"* → thay bằng quy đổi theo **nghiệp vụ**: *"1 credit ≈ 1 hội thoại AI · 1 tin ZNS/SMS · 0,5 phút gọi · 10 email marketing. Hệ thống tự chọn mô hình phù hợp."*
- Tính năng gói: *"AI Haiku + Sonnet"* → **"AI tiêu chuẩn + nâng cao"**; *"AI full model (cả Opus)"* → **"AI toàn bộ cấp độ"**.
- Ma trận so sánh: hàng *"AI model / Haiku·Sonnet·Opus"* → **"Cấp độ AI / Tiêu chuẩn · Nâng cao · Toàn bộ"**.
- Lý do: tên mô hình là chi tiết vận hành, thay đổi theo thời gian; khách chỉ cần biết năng lực và chi phí.

**3 · Gộp 2 tab trùng trong Ví AppChat**
- Trước: *Nạp Credit* và *Token & Credits* — hai cửa cùng bán tài nguyên tiêu hao.
- Nay còn **4 tab**: Tất cả · **Nạp Credit** · Tiện ích bổ sung · Dịch vụ chuyên nghiệp. Các gói tiêu hao lẻ (SMS/Email/Voice) chuyển thành mục *"Tài nguyên tiêu hao khác"* nằm trong tab Nạp Credit.

**Giữ nguyên** (đã đúng hướng, không sửa): tự động nạp khi số dư thấp · tự chuyển mô hình rẻ khi hết hạn mức thay vì dừng phục vụ · ngân sách & lịch sử chi tiêu · gói Cá nhân tính theo kênh (không tính user) · luồng thanh toán QR.

---

## [2026-07-27] — Click mẫu Quy trình → mở trình dựng workflow

- Trước: click một mẫu quy trình sẽ **rời trang** sang Trợ lý AI kèm câu lệnh dựng sẵn.
- Nay: mở thẳng **trình dựng workflow** ngay tại trang Quy trình, nạp sẵn 3 bước khung từ mẫu: **Trigger** (khi nào chạy) → **Điều kiện** (nhóm nghiệp vụ) → **Hành động**.
- Đồng bộ hành vi với trang AI Agents (click mẫu → mở cấu hình chi tiết).

---

## [2026-07-27] — Click AI Agent mẫu → mở trang cấu hình chi tiết

- Trước: click một mẫu Agent sẽ **rời trang** sang Trợ lý AI kèm câu lệnh dựng sẵn.
- Nay: mở thẳng **drawer "Cấu hình tác nhân AI"** ngay tại trang AI Agents, tự điền **tên · vai trò (nhóm ngành) · mô tả** từ mẫu đã chọn.
- Người dùng chỉnh prompt, kiến thức, công cụ rồi **Lưu** — không phải qua hội thoại nếu không muốn.

---

## [2026-07-27] — Gỡ nút "Tạo bằng Trợ lý AI"

- Xoá nút **Tạo bằng Trợ lý AI** ở header trang **AI Agents** và **Quy trình**.
- Lý do: trùng chức năng với nút **Trợ lý AI** (đen) ngay cạnh — vốn đã mở panel trợ lý để tạo agent/quy trình bằng hội thoại.
- Giữ nguyên: nút *Tạo thủ công* / *Dựng từ đầu*, thư viện mẫu và nút Trợ lý AI.

---

## [2026-07-26] — Áp trường đặc tả vào bảng Hợp đồng

- Bổ sung **3 cột** theo đặc tả (mục 6): **Loại HĐ** (Dịch vụ/Mua bán/Nguyên tắc) · **Hiệu lực** (ngày bắt đầu → ngày kết thúc) · **Báo giá LQ** (báo giá liên quan, dạng mã tham chiếu).
- Đổi nhãn *Ngày* → **Ngày ký** cho khớp đặc tả.
- Lưới bảng 10 → **13 cột**.
- Còn lại (backlog): **Đơn bán hàng · Khách hàng thân thiết**.

---

## [2026-07-26] — Áp trường đặc tả vào bảng Báo giá

- Bổ sung **2 cột** theo đặc tả (mục 5): **Hết hạn** (ngày hết hạn báo giá, mặc định +15 ngày từ ngày báo giá) và **Thuế**.
- Giữ nguyên Mã BG (kèm số lần báo giá Lx), Khách hàng, Dịch vụ, Ngày giờ, Người BG, Giá trị, Trạng thái, AI gợi ý, Thao tác.
- Lưới bảng 10 → **12 cột**.
- Còn lại (backlog): **Hợp đồng · Đơn bán hàng · Khách hàng thân thiết**.

---

## [2026-07-26] — Áp trường đặc tả vào bảng Sản phẩm

- Bảng Sản phẩm bổ sung **4 cột** theo đặc tả (mục 4): **Mã SP** (`SP-1xxx`) · **Giá vốn** · **ĐVT** (đơn vị tính) · **Thuế** (0/5/8/10%).
- Đổi nhãn cột *Giá* → **Giá bán** cho khớp đặc tả; giữ nguyên Danh mục, Đã bán, Kênh, Thuộc tính, Trạng thái, Thao tác.
- Lưới bảng 8 → **12 cột**.
- Còn lại (backlog): **Báo giá · Hợp đồng · Đơn bán hàng · Khách hàng thân thiết**.

---

## [2026-07-26] — Áp trường đặc tả vào bảng danh sách Khách hàng

- Bảng Khách hàng bổ sung **4 cột** theo đặc tả (mục 3): **Mã KH** (mã tự sinh `KH-1xxx`) · **Loại KH** (Cá nhân/Doanh nghiệp/Hộ kinh doanh) · **Nhóm KH** (VIP/Thân thiết/Mới/Tiềm năng) · **Trạng thái** (Đang hoạt động/Tiềm năng/Ngừng, hiển thị badge màu).
- Lưới bảng đi từ 12 → **16 cột**, giữ nguyên các cột sẵn có (Tên, Ngày đăng ký, Kênh, Email, SĐT, Zalo, Khu vực, Quận, Phụ trách, AI gợi ý, Thao tác).
- Còn lại (backlog): áp cột đặc tả cho bảng **Sản phẩm · Báo giá · Hợp đồng · Đơn bán hàng · Khách hàng thân thiết**.

---

## [2026-07-26] — Nối toàn bộ 7 form CRM vào nút tạo của từng module

- Trước đó chỉ Hóa đơn dùng form chuẩn; 6 module còn lại vẫn mở modal cũ thiếu trường.
- Nay `openContactNew · openProductNew · openQuoteNew · openContractNew · openOrderNew` trỏ thẳng vào form theo đặc tả; thêm nút **Thêm thành viên** cho Khách hàng thân thiết (trước chưa có CTA).
- Sửa 2 lỗi của form: trường bắt buộc nay hiển thị dấu `*`; trường File/Ảnh dùng `type="file"` thay vì text.

---

## [2026-07-26] — Bộ form nhập liệu CRM theo đặc tả nghiệp vụ

Triển khai **7 form nhập liệu độc lập** cho chuỗi vòng đời khách hàng:
**Khách hàng → Sản phẩm → Báo giá → Hợp đồng → Đơn bán hàng → Hóa đơn → Khách hàng thân thiết**

**Cấu trúc trường** — đúng theo đặc tả, chia theo nhóm (section):

| Module | Nhóm trường |
|---|---|
| Khách hàng | Thông tin cơ bản · Thông tin liên hệ · Quản lý khách hàng |
| Sản phẩm | Thông tin sản phẩm (11 trường, có ảnh) |
| Báo giá | Thông tin chung · Chi tiết sản phẩm (subform) · Tổng hợp |
| Hợp đồng | 13 trường, có Báo giá liên quan (lookup) + File hợp đồng |
| Đơn bán hàng | Thông tin chung · Chi tiết sản phẩm (subform) · Giao hàng |
| Hóa đơn | 12 trường, có Đơn bán hàng liên quan + công nợ (Đã thanh toán / Còn phải thu) |
| Khách hàng thân thiết | Thông tin thành viên · Điểm thưởng · Lịch sử giao dịch (subform) |

**Kiểu dữ liệu** hỗ trợ đủ theo mục 10: Text · Number · Currency · Date · Email · Phone · Picklist · Lookup · Subform · File · Textarea.

**Ràng buộc bắt buộc** theo mục 11: đánh dấu `*` và chặn lưu kèm thông báo liệt kê trường còn thiếu (Khách hàng: Họ tên + SĐT; Báo giá: Khách hàng + Giá trị; Hợp đồng: Khách hàng + Ngày ký + Giá trị; Đơn hàng: Khách hàng + sản phẩm; Hóa đơn: Khách hàng + Tổng tiền + Trạng thái thanh toán).

**Giao diện** theo mục 12: modal 720px, lưới 2 cột, trường dài (ghi chú/subform) chiếm hết hàng, cuộn trong thân, footer Huỷ/Lưu cố định.

**Không nhập trùng dữ liệu**: các trường liên kết dùng kiểu **Lookup** (Khách hàng, Nhân viên phụ trách, Báo giá liên quan, Hợp đồng liên quan, Đơn bán hàng liên quan) thay vì nhập tay.

**Tự động hoá** (mục 13): các trường mã (Mã KH/Số báo giá/Số hợp đồng/Mã đơn/Số hóa đơn/Mã thành viên) đặt placeholder *"Tự động sinh"*; lưu thành công phát toast ghi nhận vào nhật ký hành động.

---

## [2026-07-30] — Luồng "Thêm thành viên" 3 bước, gộp việc ghi nhận điểm

**Đã xoá khỏi header:** *Hạng & chính sách điểm* · *Ghi nhận điểm* · *Tạo voucher*. Header còn: tìm kiếm · **Thêm thành viên** · **Trợ lý AI**.

**Lý do gộp:** *Ghi nhận điểm* đứng riêng buộc nhân viên phải tự biết khách có phải thành viên chưa. Nay một luồng làm cả hai — tra số là biết ngay, chưa có thì tạo rồi ghi điểm luôn.

**Luồng mới (popup, có thanh 3 bước):**
1. **Tra số điện thoại** — nhập SĐT → *Tra cứu*.
2. **Xác định hạng** — nếu đã là thành viên: hiện tên, hạng, điểm hiện có, ngày tham gia, còn bao nhiêu điểm nữa lên hạng. Nếu chưa có: banner *"Chưa có trong chương trình"* + form thêm mới (họ tên · hạng khởi tạo · nguồn khách · điểm chuyển từ hệ thống cũ).
3. **Ghi nhận điểm** — 2 loại:
   - *Theo quy tắc*: nhập giá trị giao dịch → hiện **kết quả áp quy tắc** từng dòng (tích theo hoá đơn · nhân theo hạng · thưởng đơn lớn) + tổng điểm, dùng đúng bộ quy tắc đang bật.
   - *Điều chỉnh thủ công*: nhập số điểm ±, không qua quy tắc.
   - **Lý do bắt buộc** (7 lựa chọn: mua hàng · mua tại quầy · đền bù sự cố · chuyển điểm hệ thống cũ · thu hồi điểm cấp sai · ưu đãi chiến dịch · khác) + ghi chú *mọi lần ghi nhận đều lưu nhật ký ai/lúc nào/lý do, có thể hoàn tác* — chống lạm dụng cộng điểm tay.

Nhãn nút đáy đổi theo ngữ cảnh: *Ghi nhận điểm* (khách cũ) ↔ *Thêm thành viên & ghi điểm* (khách mới); disabled tới khi tra cứu xong.

Dữ liệu thử: `0903 123 456` → thành viên Kim cương; số khác → khách mới.

**Sửa sau kiểm tra:**
- *Câu "Còn — điểm nữa để lên hạng cao hơn (đã tối đa)"* — `toNext`/`nextTier` bị hardcode không phụ thuộc hạng. Nay tính từ **bậc hạng thật** (Thành viên 0 → Bạc 5.000 → Vàng 15.000 → Kim cương 40.000); khách Kim cương hiện *"Đã ở hạng cao nhất — giữ hạng bằng chi tiêu định kỳ"*, khách hạng dưới hiện số điểm còn thiếu thật.
- *Tra cứu lệch với bảng thành viên* — map `KNOWN` chỉ có 1 số, nên 4 thành viên đang hiển thị ngay dưới lại báo "khách mới" và mời tạo trùng. Nay tra cứu lấy từ **cùng nguồn `lyMembers`** (so khớp SĐT chỉ lấy chữ số); hệ số nhân theo hạng cũng đọc hạng thật của người tra được, không còn giả định Kim cương.
- *Typo* `Số điểm điều chỉnh (± )` → `(±)`.

---

## [2026-08-01] — Tổng quan: thay khối số liệu bằng **Kiến trúc nền tảng**

**Giữ nguyên:** khối chào + **Onboarding checklist** (thu gọn/mở rộng) và widget **Trung tâm cập nhật** góc phải (3 tab: Cần follow · Tin tức · Thông báo).

**Gỡ bỏ** 5 khối số liệu: Live status bar · Tình hình hôm nay · Phễu chuyển đổi AI · Agent đang chạy · KPI Nhân sự & AI Agents.

**Thay bằng** sơ đồ kiến trúc 4 tầng, lấy **AI Agents làm tâm điểm vận hành**:
1. **Kênh kết nối** — 15 điểm chạm (Zalo OA/Personal · Facebook · Messenger · Instagram · WhatsApp · Telegram · TikTok · Web · Email · Voice · Call Center · API).
2. **AI Agentic — trung tâm vận hành** — Tin đến → AI phân loại & phân luồng → **Trợ lý AI · Orchestrator** → 4 agent phòng ban (Marketing · Sales · CSKH · Operation); ghi rõ AI tự xử ~85%, human-in-the-loop khi độ tin cậy < 70%, RAG · Workflow · Training Studio.
3. **Module nghiệp vụ** — 11 module do agent phòng ban điều phối.
4. **CDP** — nền dữ liệu hợp nhất (hồ sơ 360°, lịch sử đa kênh, phân khúc động, trường tuỳ biến).

Cuối trang là 4 trụ nền tảng: **Multi-tenant · API-first · Bảo mật & SLA · Mobile-first**.

Markup tĩnh hoàn toàn (không dùng biến động) nên trang hiển thị tức thì; giữ đúng ngôn ngữ thị giác hiện có (thẻ trắng bo 16px, viền #E5E7EB, nhấn thương hiệu #2DC56A).

---

## [2026-07-30] — Dọn hệ quả sau khi xoá các thẻ Loyalty

**1 · Nút "Ghi nhận điểm" cao 53px thay vì 36px**
- **Nguyên nhân:** đây là nút duy nhất trong hàng header không khai `height:36px`; khi hàng bị tràn, nhãn xuống 2 dòng nên hộp cao vượt mức sàn 36px.
- **Sửa:** thêm `height:36px` + `white-space:nowrap` — khớp 4 nút còn lại trong cùng hàng và đúng chuẩn 36px toàn app.

**2 · Câu mô tả và nút không còn đối tượng**
- Phụ đề trang vẫn ghi *"Hạng thành viên · tích điểm · voucher · gói dịch vụ"* nhưng thẻ *Gói và Thẻ dịch vụ*, *Voucher đang phát hành* đã xoá → sửa thành **"Hạng thành viên · tích điểm · giữ chân khách"**.
- Bỏ CTA **Tạo voucher** vì không còn nơi nào xem voucher trên trang.
- Hành động trên dòng cảnh báo rời bỏ: *Tặng voucher* → **Tặng ưu đãi** cho khớp.

**3 · Cột TRẠNG THÁI của Danh sách thành viên chứa động từ hành động**
- **Hiện tượng:** header ghi *TRẠNG THÁI* nhưng giá trị là *Phát voucher · Cộng điểm · Đổi quà* — vừa sai loại dữ liệu, vừa trỏ tới UI đã xoá (thẻ voucher, danh mục đổi thưởng).
- **Sửa:** thay bằng trạng thái thật cho cả 5 dòng — **Đang hoạt động** (xanh) · **Ngừng tương tác** (cam) · **Mới** (xanh dương) · **Sắp rời bỏ** (đỏ). Header giữ nguyên *TRẠNG THÁI* vì giờ đã đúng nghĩa.
- Panel chi tiết thành viên: nút *Phát voucher* → **Tặng ưu đãi**, khớp cách gọi ở bảng cảnh báo rời bỏ.

---

## [2026-07-30] — Xoá khối Danh mục đổi thưởng

Theo yêu cầu, xoá khối **Danh mục đổi thưởng** vừa thêm (kèm dữ liệu `lyRewards`). Các điều chỉnh khác cùng đợt vẫn giữ: bảng đổi tên còn *Quy tắc tích điểm*, nút *Hạng & chính sách điểm*, gỡ nút *Điều kiện lên hạng* trùng.

Trang còn 4 khối: **Tổng quan điểm & doanh thu** → **Danh sách thành viên** → **Cảnh báo khách sắp rời bỏ** → **Quy tắc tích điểm**.

---

## [2026-07-30] — Tách tích điểm và đổi điểm (hết chồng lấn)

**Vấn đề phát hiện:** bảng tên *"Quy tắc tích điểm & đổi điểm"* nhưng builder KHI/NẾU/THÌ chỉ xử lý **tích** — mọi kiểu tính đều là cộng điểm. Không có chỗ nào cấu hình việc khách **dùng** điểm. Hệ quả: khách tích được điểm nhưng không có gì để đổi.

**Nguyên nhân kiến trúc:** hai nghiệp vụ khác mô hình — tích điểm do *hệ thống* kích hoạt theo sự kiện (KHI → NẾU → THÌ), còn đổi điểm do *khách* chủ động yêu cầu, cần danh mục quà + tồn kho + phê duyệt. Ghép chung một bảng là sai.

**Đã điều chỉnh:**
1. Bảng đổi tên còn **"Quy tắc tích điểm"** — bỏ chữ *& đổi điểm*.
2. Gộp nút **Điều kiện lên hạng** (trùng chức năng) khỏi header bảng quy tắc → thuộc về cấu hình chương trình.
3. Nút **Cấu hình chương trình** đổi tên thành **Hạng & chính sách điểm** — nói rõ nó định nghĩa hạng và chính sách chung (luật chơi cố định), khác với quy tắc tích điểm (thay đổi theo chiến dịch).
4. Thêm khối mới **Danh mục đổi thưởng** — bảng 7 cột: Quà đổi · Loại · Giá điểm · Hạng tối thiểu · Tồn kho (thanh tiến trình, đỏ khi <20%) · Giới hạn mỗi khách · Trạng thái (toggle).
   - 5 loại quà: Giảm giá · Voucher · Dịch vụ · Quà vật lý · Nâng hạng.
   - Header: tỉ lệ quy đổi điểm→tiền (100 điểm = 10.000đ) · **Chính sách đổi** · **Thêm quà đổi**.
   - Footer: số quà đang mở + số yêu cầu đổi chờ duyệt + **Xem yêu cầu đổi**.

**Phân vai sau điều chỉnh (không còn trùng):**

| Chức năng | Ai kích hoạt | Phạm vi |
|---|---|---|
| Hạng & chính sách điểm | Quản trị (một lần) | Luật chơi: hạng, đơn vị điểm, làm tròn |
| Quy tắc tích điểm | Hệ thống (sự kiện) | Cách khách kiếm điểm, mọi khách |
| Danh mục đổi thưởng | Khách yêu cầu | Cách khách dùng điểm |
| Ghi nhận điểm | Nhân viên (thủ công) | Ngoại lệ, một khách cụ thể |

---

## [2026-07-30] — Gọn lại trang Khách hàng thân thiết

Xoá 4 thẻ tổng hợp hàng giữa: **Phân bố theo hạng · Gói và Thẻ dịch vụ · Voucher đang phát hành · Hoạt động hôm nay** (kèm dữ liệu `lyTiers` · `lyPackages` · `lyVouchers` · `lyToday` không còn dùng).

Trang còn lại 4 khối theo đúng luồng vận hành: **Tổng quan điểm & doanh thu** → **Danh sách thành viên** → **Cảnh báo khách sắp rời bỏ** → **Quy tắc tích điểm**.

---

## [2026-07-30] — Sửa lỗi logic mô phỏng tính điểm Loyalty

**1 · Tổng điểm sai ở chế độ "Chỉ quy tắc ưu tiên cao nhất" (lỗi nghiêm trọng)**
- **Hiện tượng:** hạng Vàng · hoá đơn 6.000.000đ → danh sách hiện 3 quy tắc (ưu tiên 1 +600 · ưu tiên 2 +300 · ưu tiên 3 +1.000) nhưng Tổng điểm trả **1.000**, đúng phải là **600**.
- **Nguyên nhân:** `lySimTotal` dùng `Math.max(...vals)` — chọn theo *số điểm lớn nhất* thay vì *số ưu tiên nhỏ nhất*, trái với chính ghi chú trên UI ("chỉ quy tắc có số ưu tiên nhỏ nhất được áp").
- **Cách sửa:** gộp về một hàm dùng chung `lySimCalc()` trên class, mỗi quy tắc mang theo `prio`, chọn `min(prio)`. Cả danh sách quy tắc và tổng điểm đọc từ cùng một nguồn nên không thể lệch nhau, và vẫn đúng nếu sau này đổi thứ tự push.

**2 · Không phân biệt quy tắc được áp vs bị bỏ qua**
- Chế độ ưu tiên: quy tắc thắng có badge **"Được áp"**; quy tắc bị loại mờ 50%, nhãn *"— bị bỏ qua"*, điểm hiển thị `0`.
- Quy tắc đang tắt: nhãn *"— đang TẮT"*, không tham gia tính.
- Trước đó cả 3 dòng đều hiện điểm như nhau → người đọc tưởng khách nhận cả 3.

**3 · Định dạng số trong "Câu hoàn chỉnh"**
- `THÌ 10000đ = 1 điểm` → `THÌ 10.000đ = 1 điểm`, khớp định dạng của bảng quy tắc.

**Đã kiểm tra không đổi:** chế độ *Cộng dồn tất cả* vẫn cho 1.900 điểm (đúng); không có lỗi console; bảng cảnh báo rời bỏ và bảng quy tắc không tràn ngang; 8 `<select>` bind đúng state.

---

## [2026-07-30] — Quy tắc tích điểm chuyển sang builder KHI · NẾU · THÌ

**Vấn đề:** bảng quy tắc cũ ghi cách tính bằng *chữ cố định* (`10.000đ = 1 điểm`) — người dùng chỉ đọc được, không sửa được logic. Mỗi ngành (spa theo buổi · F&B theo hoá đơn · TMĐT theo sản phẩm · B2B theo hợp đồng) lại cần công thức khác → phải sửa code.

**Giải pháp:** mỗi quy tắc trở thành một câu 3 mệnh đề, cùng cấu trúc với Workflow.

**1 · Bảng danh sách quy tắc — dựng lại 6 cột**
- `Ưu tiên` (có tay cầm kéo thả) · `Khi · sự kiện` · `Nếu · điều kiện` (chip, "Mọi trường hợp" khi trống) · `Thì · cộng điểm` · `Hạn dùng` · `Trạng thái` (toggle + ⋯).
- Header thêm bộ chọn **xử lý xung đột**: *Cộng dồn tất cả* ↔ *Chỉ quy tắc ưu tiên cao nhất* — trước đây thiếu, dẫn đến tính điểm sai khi nhiều quy tắc trúng cùng lúc.
- Footer: số quy tắc đang bật + chế độ đang áp + nút **Thử nghiệm tính điểm**.
- Click một dòng → mở builder.

**2 · Drawer builder (560px) — 3 khối màu tương ứng 3 mệnh đề**
- **KHI** (xanh dương): 10 sự kiện lấy từ chính các module — hoá đơn thanh toán · đơn giao thành công · hợp đồng ký · hoàn tất buổi dịch vụ · mua gói/thẻ · khách đánh giá · giới thiệu bạn · sinh nhật · hoàn tất hồ sơ · không giao dịch N ngày. Mỗi sự kiện có dòng giải thích ngữ cảnh dùng.
- **NẾU** (vàng): nhiều điều kiện cộng dồn, mỗi dòng = `trường` + `toán tử` + `giá trị`, thêm/xoá được. 8 trường (hạng · giá trị · sản phẩm · nhóm SP · kênh mua · ngày trong tuần · khách mới · số lần mua) × 6 toán tử.
- **THÌ** (xanh brand): 4 kiểu tính (quy đổi theo tiền · điểm cố định · nhân hệ số · điểm theo đơn vị/buổi) — nhãn ô giá trị đổi theo kiểu đã chọn; kèm nhân theo hạng, hạn dùng điểm, **giới hạn mỗi khách** (chống lạm dụng), ưu tiên.
- **Câu hoàn chỉnh**: sinh tự động realtime từ lựa chọn, đọc được như tiếng Việt bình thường.

**3 · Mô phỏng trước khi bật**
- Popup nhập giao dịch giả (hạng khách · sự kiện · giá trị) → liệt kê **quy tắc nào được áp** kèm số điểm từng quy tắc → **tổng điểm khách nhận**.
- Tôn trọng chế độ cộng dồn / ưu tiên cao nhất; quy tắc đang TẮT hiện rõ là không tham gia.
- Mục đích: tránh phát sai điểm cho khách thật rồi phải thu hồi.

**Còn mở (backlog):** Mức 1 — bộ quy tắc mẫu nạp sẵn theo ngành lúc onboarding; Mức 3 — ra lệnh bằng Trợ lý AI ("khách hạng Vàng mua trên 2 triệu thì tích điểm gấp rưỡi") rồi duyệt bản xem trước. Cả hai dùng chung cấu trúc dữ liệu này.

---

## [2026-07-30] — Hoàn thiện module Khách hàng thân thiết (Loyalty)

Bổ sung 3 khối còn thiếu để module làm đúng vai trò **giữ chân**, không chỉ là trang thống kê:

**1 · Danh sách thành viên (bảng)**
- Đổi tiêu đề *Top thành viên* → **Danh sách thành viên** (bảng đã có tìm kiếm, lọc theo hạng, phân trang, 8 cột: #, thành viên, hạng, điểm hiện có, tổng tích luỹ, đã dùng, chi tiêu, trạng thái, thao tác).

**2 · Quy tắc tích điểm & đổi điểm (cấu hình được)**
- Bảng 6 cột: Tên quy tắc · Điều kiện phát sinh · Cách tính điểm · Áp dụng cho · Hạn dùng · Trạng thái (toggle bật/tắt + menu ⋯).
- 8 quy tắc mẫu: tích theo hoá đơn (10.000đ = 1 điểm) · nhân điểm theo hạng (×1,5 / ×2) · thưởng đăng ký lần đầu · thưởng sinh nhật · thưởng giới thiệu bạn · đổi điểm sang tiền (100 điểm = 10.000đ) · thưởng đánh giá 5 sao · tích điểm mua combo.
- CTA: **Thêm quy tắc** · **Điều kiện lên hạng**.

**3 · Cảnh báo khách sắp rời bỏ**
- Bảng 6 cột: Thành viên · Hạng · Mức rủi ro (điểm 0–100 + thanh tiến trình) · Dấu hiệu · Lần cuối · Hành động.
- Dấu hiệu AI phát hiện: lâu không đặt lịch · điểm sắp hết hạn · gói dịch vụ còn buổi chưa dùng · bỏ lịch hẹn liên tiếp · mở tin nhưng không phản hồi.
- Hành động mỗi dòng: **Tặng voucher** · **Giao AI** (một chạm); ở header có **Giao AI chăm sóc tất cả** và **Xuất danh sách**.

Ghi chú kỹ thuật: `ic-alert` không tồn tại trong bộ icon → dùng `ic-bell`.

---

## [2026-10-23] — Hoàn tác vòng đời tác nhân AI

Đã gỡ toàn bộ phần vòng đời agent (Tri thức · Tính cách · Kiểm thử · Đánh giá · Phiên bản · Giám sát, cả dạng tab lẫn trang cuộn). Trang **Cấu hình tác nhân AI** trở về đúng bản gốc trước đó: header *Hủy bỏ · Xuất bản*, khung cấu hình + chạy thử hai cột.

---

## [2026-10-27] — Trợ lý AI (widget website): bỏ Điểm chạm · mở rộng nghiệp vụ & kiến thức

- **Xoá section "Điểm chạm đang hoạt động"** (bảng Widget · Link · QR).
- **Thu thập thông tin → đưa vào nghiệp vụ** — thêm dòng giải thích (AI hỏi đủ thông tin rồi tự tạo bản ghi ở module tương ứng) và mở rộng từ 4 lên **7 nghiệp vụ**: Giải đáp câu hỏi · Tạo Lead (CRM) · Tạo Ticket · Đặt lịch hẹn · Tạo báo giá · Tạo hợp đồng · Nhắc công nợ. Mặc định bật: Giải đáp, Lead, Ticket. Hiện số nghiệp vụ đang bật.
- **Phạm vi kiến thức của AI Agent** — mở rộng từ 4 lên **7 nguồn**: Catalogue sản phẩm · Bảng giá · Chính sách đổi trả & bảo hành · FAQ · Thông tin công ty · Quy trình bán hàng · Website. Hiện số nguồn đang dùng.
- **"+ Bổ sung vào Agent"** trước chỉ hiện thông báo → nay mở khung thêm kiến thức ngay tại chỗ với 3 cách: **Tài liệu** (tên tệp) · **Website** (URL) · **Hỏi – đáp** (câu hỏi + câu trả lời chuẩn). Nguồn mới được thêm vào danh sách và bật sẵn.

---

## [2026-10-27] — KPI & Mục tiêu: giao cho nhân sự hoặc AI Agent

Mục *"Phân bổ đích danh nhân sự"* trong form Tạo/Sửa mục tiêu → **"Giao cho nhân sự hoặc AI Agent"**:
- Hai nút thêm: **Nhân sự** (xanh) · **AI Agent** (tím). Khi chưa giao cho ai, hiện hướng dẫn.
- Mỗi dòng có nhãn loại **Người / AI** (bấm để đổi loại); danh sách chọn đổi theo loại — nhân sự công ty hoặc AI Agent (Sales AI · CSKH AI · Marketing AI · Lead Qualify · Booking · Thu hồi công nợ · Vận hành AI). Vẫn giữ mức năng lực và mức mục tiêu riêng cho từng người/agent.
- Lưu kèm loại người nhận; trong danh sách mục tiêu (mở rộng dòng), AI Agent hiện avatar tím ✦ + nhãn **AI Agent** để phân biệt với nhân viên.

---

## [2026-10-27] — Phòng ban: thêm nhân sự vào phòng + phân trang thẻ

**Thêm nhân sự** — trong form *Tạo phòng ban* / *Cấu hình*, mục **Thành viên** mới:
- Ô tìm nhân sự + danh sách gợi ý, bấm **+ Thêm** để đưa vào phòng; người đã chọn hiện dạng chip, bấm ✕ để gỡ.
- Mỗi nhân sự chỉ thuộc **một** phòng — gợi ý ghi rõ *"Đang ở [phòng X] · sẽ chuyển sang phòng này"*; lưu xong tự gỡ khỏi phòng cũ.
- Số người trên thẻ phòng ban và danh sách nhân sự (nút *Thành viên*) cập nhật theo.

**Phân trang thẻ** — lưới thẻ có thêm *‹ Trước · Tiếp ›* và nhãn *Trang X / Y · N phòng ban* (trước đây phòng thứ 13 trở đi không xem được). Phòng mới tạo xếp **đầu danh sách** và về trang 1 nên thấy ngay.

---

## [2026-10-29] — Hộp thư: menu ⋯ trên tin nhắn đúng ngữ cảnh

Trước: menu của từng bubble trộn **Quản lý tin nhắn** (Thu hồi, Xóa) với **Quản lý hội thoại** (Lưu trữ, Ẩn, Xóa lịch sử, Tạo nhóm) — các mục sau không thuộc về tin nhắn, và thiếu hành động phổ biến.

Nay menu bubble chỉ chứa việc liên quan **tin nhắn được chọn**:
- Hàng **cảm xúc** trên cùng: 👍 ❤️ 😂 😮 😢 🙏 (bấm lại để bỏ; cảm xúc đang chọn có viền xanh)
- **Trả lời** (đưa con trỏ vào khung nhập) · **Sao chép** (vào clipboard) · **Chuyển tiếp** · **Ghim tin nhắn** · **Dịch** · **Tạo ticket từ tin này** (mở modal ticket điền sẵn tiêu đề + khách)
- Nhóm nguy hiểm: **Thu hồi** (ghi chú *Chỉ tin của bạn*) · **Xóa tin nhắn** (đỏ, hỏi xác nhận)

**Quản lý hội thoại chuyển sang menu ⋯ của dòng hội thoại** (dưới đường kẻ ngăn): *Lưu trữ hội thoại · Ẩn trò chuyện · Tạo nhóm · Xóa lịch sử* (đỏ, hỏi xác nhận).

Thêm icon `ic-reply`. Giới hạn: hành động chưa tác động vào dữ liệu thật — Sao chép chạy thật; còn lại hiện thông báo xác nhận. Menu vẫn dùng chung cho mọi bubble (chưa nhận biết tin của khách hay của nhân viên để ẩn/hiện *Thu hồi*).

---

## [2026-10-29] — Hộp thư: menu ⋯ trên từng hội thoại hoạt động đầy đủ

Trước: menu 6 mục chỉ để trang trí — bấm mục nào cũng chỉ đóng menu, các mục có › không mở gì.
Nay (submenu mở **thay nội dung menu**, có nút ‹ quay lại, mở rộng 236px):
- **Đóng hội thoại** — chạy ngay, chuyển vào tab *Đã đóng*.
- **Tạm ẩn ›** — 1 giờ · 3 giờ · Đến sáng mai · Tuỳ chọn ngày giờ.
- **Phím tắt ›** — `/chao · /baogia · /lich · /camon`, kèm nội dung xem trước; chọn là **chèn vào khung nhập** (chưa gửi).
- **Phân công ›** — 4 nhân viên + 2 AI Agent kèm số hội thoại đang xử lý; dấu ✓ ở người hiện tại.
- **Vòng đời ›** — 6 giai đoạn (Mới → Thân thiết), ✓ giai đoạn hiện tại; ghi chú sẽ cập nhật hồ sơ 360° và Kanban.
- **Gắn thẻ** — chọn **nhiều** thẻ (VIP · Cần gọi lại · Đã báo giá · Khiếu nại · Quan tâm HIFU · Khách sỉ), nút *Xong · gắn N thẻ*.

Theo đề xuất: *Vòng đời* và *Gắn thẻ* áp cho **khách hàng** (không riêng hội thoại); *Đóng hội thoại* đóng ngay, không bắt chọn lý do.
Giới hạn: lựa chọn mới lưu trong phiên và **chưa phản chiếu** ra dòng hội thoại, hồ sơ 360° hay Kanban thật — hiện chỉ có thông báo xác nhận.

---

## [2026-10-29] — Hồ sơ 360°: 6 nút thao tác mở modal ngay trong Hộp thư

Trước: *Tạo ticket* chuyển sang trang Hỗ trợ; 5 nút còn lại không có hành động. Nay cả 6 nút (Hộp thư + trang Khách hàng) **mở modal tạo/cập nhật của module tương ứng ngay tại chỗ, điền sẵn thông tin khách**, không rời Hộp thư:
- **Báo giá** — khách đã có BG-2041 → mở form *Cập nhật báo giá · BG-2041* điền đủ số, ngày, giá trị, trạng thái
- **Hợp đồng** — khách đã có HĐ-0412 (Chờ ký) → *Cập nhật hợp đồng · HĐ-0412*
- **Đơn hàng** — chưa có đơn → *Tạo đơn bán hàng* điền khách, hợp đồng liên quan, ngày, người nhận, SĐT
- **Tạo ticket** — modal Tạo ticket của trang Hỗ trợ, điền tiêu đề + khách + email
- **Đặt lịch** — modal Tạo lịch hẹn, điền tiêu đề + người tham gia
- **Gửi email** — modal soạn email mới (dùng chung): gửi từ, đến (điền sẵn), 3 mẫu email đổi tiêu đề/nội dung

Quy tắc tạo/cập nhật: có bản ghi đang mở của khách → **Cập nhật** (tiêu đề form ghi mã bản ghi, toast *Đã cập nhật…*); chưa có → **Tạo mới**. Tooltip trên nút nói trước sẽ tạo hay cập nhật.

Kỹ thuật: `openCrmForm(mod, values, mode, ref)` nhận dữ liệu điền sẵn + chế độ; các ô form CRM chuyển sang có giá trị. Mở modal ticket/lịch hẹn từ trang gốc vẫn trống như cũ.

---

## [2026-10-29] — AI Agent: Skills · Nền tảng kết nối · Tiện ích đồng bộ thật + khung "Agent đang chạy"

**Một danh mục chung, cấp quyền theo từng Agent:**
- `agCatalog()` là nguồn duy nhất cho 6 Skills · 10 Nền tảng kết nối · 6 Tiện ích (trước đó danh sách nằm riêng trong menu ＋ của Hộp thư).
- Cài đặt → AI Agent → tab **Công cụ & Quyền**: thêm 3 khối cấp quyền với công tắc thật cho **đúng Agent đang mở** (đếm *n/tổng*). Ví dụ Sales Agent được Chấm điểm lead + KiotViet + Bảng giá; Marketing Agent chỉ Soạn phản hồi + Brevo.
- Menu ＋ trong Hộp thư **đọc cùng bảng cấp quyền**: mục Agent phụ trách hội thoại (hiện là Sales Agent) chưa được cấp thì **mờ, ghi "Chưa cấp cho Sales Agent · bật ở Cài đặt AI Agent"** và không dùng được. Tiêu đề submenu ghi rõ *cấp cho Sales Agent*.

**Tab Cowork (Trợ lý AI): khung "Trợ lý AI đang điều phối"** — mỗi việc đang giao có: tên việc, Agent nhận việc, công cụ dùng, thanh tiến độ, trạng thái (*Đang chạy · Chờ bạn duyệt · Hoàn tất*) và nút (*Dừng · Duyệt & gửi · Xem kết quả*). Tiêu đề tổng hợp *"4 việc · 2 đang chạy · 1 cần bạn duyệt"*; *Duyệt & gửi* chuyển việc sang *Hoàn tất*.

*Cập nhật:* khung chỉ còn **một hàng thu gọn** (tên + *"4 việc · 2 đang chạy · 1 cần bạn duyệt"* + *Xem chi tiết ›*) để không đẩy dải thẻ Agent xuống; bấm vào mở **modal** chứa danh sách việc, nút *Dừng · Duyệt & gửi · Xem kết quả* nằm trong modal.

Giới hạn: Agent phụ trách hội thoại trong Hộp thư đang **cố định là Sales Agent**; danh sách việc đang chạy là dữ liệu mẫu; chưa có mức quyền *chỉ tra cứu · cần duyệt · tự thực hiện* cho từng công cụ; cấu hình lưu theo phiên.

---

## [2026-10-29] — Hộp thư: menu ＋ trong khung nhập có chi tiết thật

Trước: menu ＋ (*Thêm tệp · Chụp ảnh màn hình · Skills › · Connectors › · Plugins › · Research · Web search*) chỉ là danh sách tên; chọn mục nào cũng chỉ hiện thông báo.
Nay:
- **Skills ›** — 6 skill, mỗi dòng có mô tả, lệnh (`/summary · /draft · /translate · /intent · /score · /extract`), công tắc bật/tắt. Bấm dòng = **chèn lệnh vào khung nhập**; skill đang tắt thì nhắc bật.
- **Connectors ›** — 10 nền tảng (Zalo ZBS · Google Sheets · Misa · KiotViet · Sapo · Haravan · WooCommerce · Odoo · Brevo · Fast): nền tảng **đã kết nối** có công tắc *dùng trong hội thoại này*; nền tảng **chưa kết nối** có nút *Kết nối* → mở Cài đặt → Nền tảng kết nối.
- **Plugins ›** — 6 tiện ích (Bảng giá & Báo giá · Tra cứu đơn hàng · Kiểm tra tồn kho · Lịch hẹn · Thanh toán QR · Khảo sát CSAT) bật/tắt từng cái, hiện trạng thái.
- Mỗi submenu có dòng **Quản lý … ›** ở cuối; submenu rộng 320px.
- **Research** và **Web search** thành **công tắc thật**: bật thì dòng tô xanh và hiện *✓ Bật*, menu giữ nguyên để bật cả hai.
- **Chụp ảnh màn hình** hiện xác nhận đã đính kèm.

Giới hạn: trạng thái bật/tắt lưu trong phiên; Research/Web search/Plugins chưa thực sự thay đổi nội dung AI trả lời; ảnh chụp màn hình chưa tạo tệp đính kèm thật.

---

## [2026-10-29] — Hồ sơ 360°: sửa · xoá được cả tab mặc định, thêm khối vào tab mặc định

Trước: 5 tab mặc định (Tổng quan · CRM · AI · Tệp · Lịch sử) chỉ ẩn/đổi tên được; khối chỉ thêm được ở *tab riêng*.
Nay trong *Tuỳ chỉnh Hồ sơ 360°* mọi tab đối xử như nhau:
- Tab mặc định gắn nhãn **MẶC ĐỊNH**, có nút **xoá** (hỏi xác nhận) — xoá khỏi **mẫu đang sửa**, không ảnh hưởng mẫu khác.
- Xoá nhầm → dòng **"Tab mặc định đã xoá · thêm lại"** hiện chip *+ CRM · + Tệp…* để khôi phục.
- Mọi tab (kể cả mặc định) có hàng chip **khối bổ sung** từ thư viện 12 khối. Với tab mặc định, khối hiển thị **bên dưới nội dung gốc**, ngăn bằng dải *KHỐI BỔ SUNG*; với tab riêng, khối là toàn bộ nội dung.
- Bỏ khoá riêng cho *Tổng quan*; thay bằng quy tắc chung: **luôn giữ ít nhất 1 tab**, không tắt/xoá được tab cuối.

Giới hạn: chưa sửa được **bên trong** khối gốc của tab mặc định (VD bỏ riêng thẻ "Tín hiệu khách hàng" khỏi tab AI) — chỉ thêm khối hoặc xoá cả tab.

---

## [2026-10-29] — Hồ sơ 360°: bố cục tab cấu hình được theo mẫu & vai trò

Trước: 5 tab Hồ sơ 360° (Tổng quan · CRM · AI · Tệp · Lịch sử) viết cứng trong code; muốn thêm tab phải sửa code.

**Nay bố cục chạy theo mẫu (layout):**
- **Nút ⚙ ở góc phải thanh tab** (Hộp thư và trang Khách hàng) mở *Tuỳ chỉnh Hồ sơ 360°*: bật/tắt từng tab, đổi tên, đổi thứ tự (↑ ↓), xoá tab riêng, **+ Thêm tab mới** (đặt tên + chọn khối), *Đặt lại mặc định*. Thay đổi áp dụng ngay, không cần Lưu. *Tổng quan* luôn hiển thị.
- **Thư viện 12 khối** cho tab riêng: Thông tin liên hệ · Trường tuỳ chỉnh · Ticket đang mở · SLA phản hồi · CSAT gần nhất · Ghi chú chăm sóc · Báo giá · Đơn hàng · Lịch hẹn · Điểm & hạng · Tín hiệu AI · Tóm tắt AI.
- **Cài đặt → Hồ sơ 360°** (mục mới ở nhóm Ứng dụng): danh sách mẫu, mỗi mẫu có chip tab đang hiển thị, **gán cho vai trò** (Quản trị · Kinh doanh · CSKH · Marketing · Vận hành; mỗi vai trò chỉ một mẫu), *Chỉnh sửa bố cục · Nhân bản · Xoá*, *+ Tạo mẫu mới*, và ô **Xem như vai trò** để xem thử bố cục theo vai trò.
- **3 mẫu có sẵn:** *Mặc định workspace* (5 tab chuẩn) · *CSKH* (thêm tab riêng **CSKH** sau Lịch sử gồm Ticket · SLA · CSAT · Ghi chú — đúng ví dụ yêu cầu) · *Kinh doanh* (thêm tab **Giao dịch**: Báo giá · Đơn · Lịch hẹn; ẩn Tệp).
- Vai trò chưa được gán mẫu → dùng mẫu đầu tiên (Mặc định workspace).

Giới hạn: dữ liệu trong khối của tab riêng là **mẫu cố định** (chưa lấy theo khách đang mở); cấu hình lưu trong phiên, tải lại trang sẽ về mặc định; chưa có cấp **cá nhân tự sắp lại** như đề xuất ban đầu — mới ở cấp workspace/vai trò.

---

## [2026-10-29] — Hộp thư: nút nghiệp vụ trong Hồ sơ 360° mở form tại chỗ

6 nút cuối Hồ sơ 360° (*Báo giá · Hợp đồng · Đơn hàng · Gửi email · Tạo ticket · Đặt lịch*) **không còn chuyển sang trang khác**. Bấm là mở đúng form của module đó **ngay trên màn Hộp thư**, đã điền sẵn thông tin khách đang trò chuyện (Chị Lan Nguyễn · Spa Hương Sen):

| Nút | Hành vi | Điền sẵn |
|---|---|---|
| Báo giá | **Cập nhật** BG-2041 (khách đã có báo giá) | số báo giá, khách, ngày, hạn, nhân viên, trạng thái, giá trị, ghi chú |
| Hợp đồng | **Cập nhật** HĐ-0412 | mã, khách, báo giá liên quan, ngày ký, giá trị, loại, trạng thái |
| Đơn hàng | **Tạo mới** (khách chưa có đơn) | khách, hợp đồng liên quan, ngày đặt, trạng thái *Mới*, người phụ trách, người nhận, SĐT |
| Gửi email | Soạn email | người nhận, tiêu đề + nội dung theo mẫu |
| Tạo ticket | Tạo mới | tiêu đề, khách, email |
| Đặt lịch | Tạo mới | tiêu đề lịch, người tham gia |

- Quy tắc tạo/cập nhật: khách **đã có** bản ghi → mở chế độ *Cập nhật* (tiêu đề form ghi mã bản ghi), **chưa có** → *Tạo mới*. Tooltip nút nêu rõ (*"Cập nhật báo giá BG-2041"* / *"Tạo đơn hàng mới cho Chị Lan Nguyễn"*).
- Dùng lại **đúng form** của các trang Báo giá · Hợp đồng · Đơn bán hàng · Hỗ trợ · Lịch hẹn; các form nằm ở cấp gốc ứng dụng (z-index 1400, trên panel 360° ở mọi bề rộng) nên mở được từ mọi màn. Áp dụng cho cả panel 360° ở Hộp thư lẫn trang Khách hàng.

---

## [2026-10-29] — Hộp thư: tìm trong hội thoại (🔍)

Biểu tượng kính lúp trên tiêu đề hội thoại trước chưa có chức năng. Nay bấm vào mở **thanh tìm kiếm ngay dưới tiêu đề**:
- Gõ là tìm ngay trong hội thoại đang mở, không phân biệt dấu; từ khoá tô vàng, kết quả đang chọn tô đậm + viền cam và tự cuộn tới giữa khung.
- Bộ đếm **N/M**, nút **↑ ↓** (hoặc Enter / Shift+Enter) để nhảy giữa kết quả; **Esc** hoặc ✕ để đóng và xoá đánh dấu.
- Lọc theo **người gửi**: Tất cả · Khách · Nhân viên · AI Agent.
- Không có kết quả → gợi ý dùng ô tìm ở danh sách hội thoại để tìm trong tất cả hội thoại.

Chưa làm: lọc theo loại (Ảnh/Video · Tệp · Liên kết) và theo thời gian.

---

## [2026-10-29] — Hồ sơ 360°: đồng bộ kích thước nút thao tác · hoàn tác thanh nổi

**Hoàn tác:** bỏ thanh "Chọn tất cả · Chuyển tiếp…" nổi ở đáy màn hình (hiểu sai yêu cầu). Các trang Khách hàng · Báo giá · Hợp đồng · Đơn bán hàng trở lại thanh thao tác nằm trên bảng như trước; bỏ tweak `bulkBarPos`. Giữ 2 tweak `tableScroll`, `stickyHeader`.

**Đúng yêu cầu — nút cuối Hồ sơ 360° (Hộp thư + Khách hàng):** hai hàng nút trước lệch nhau (*Báo giá · Hợp đồng · Đơn hàng* cao 32px, chữ 12,7px, rộng theo nội dung; *Gửi email · Tạo ticket · Đặt lịch* cao 38px, chữ 14,3px). Nay cả 6 nút cùng **cao 36px · bo 9px · chữ 13,4px đậm · icon 14px · chia đều bề rộng**, khoảng cách 6px; **cùng nền trắng viền xám `#E5E7EB`** (bỏ nền xanh/vàng/xanh nhạt của hàng dưới), chỉ chữ và icon giữ màu riêng từng nút.

---

## [2026-10-29] — Thanh thao tác đã chọn gom 1 chỗ + Tweaks cho bảng

**Thanh "Chọn tất cả · Chuyển tiếp · Gán phụ trách · Duyệt…"** (Khách hàng · Báo giá · Hợp đồng · Đơn bán hàng) trước nằm trong luồng nội dung phía trên bảng. Nay mặc định **nổi cố định giữa đáy màn hình** (nền mực, bo 14px, đổ bóng) — luôn ở một chỗ, không cuộn theo bảng. Trang chừa 86px dưới cùng để thanh không che dòng cuối; thanh giới hạn bề rộng màn hình và tự cuộn ngang nếu nhiều nút.
- Khách hàng: chỉ **nhóm chọn + thao tác** (Chọn tất cả · Chuyển tiếp · Gán phụ trách · Tạo Ticket/Lịch hẹn/Báo giá/Hóa đơn/Đơn hàng) nổi xuống đáy; **bộ lọc · Lọc · Sắp xếp · Tạo trường giữ nguyên trên thanh công cụ**.

**Tweaks mới** (nhóm *Bảng dữ liệu*):
- `bulkBarPos` — `floating` (nổi đáy màn hình, mặc định) · `top` (nằm trên bảng như cũ)
- `tableScroll` — `inside` (chỉ cuộn trong bảng, mặc định) · `page` (cuộn cả trang như trước)
- `stickyHeader` — bật/tắt hàng tiêu đề cột dính trên cùng

Cài đặt qua class trên vùng nội dung chính (`bulk-float` · `page-scroll` · `no-sticky`), đọc từ `this.props`.

---

## [2026-10-29] — Bảng dữ liệu cuộn bên trong bảng, không cuộn cả trang

Trước: toàn bộ trang cuộn theo bảng — tiêu đề, ô tìm kiếm, thẻ thống kê và bộ lọc trôi mất khi xem dòng phía dưới.

Sau (7 trang bảng: **Khách hàng · Sản phẩm · Báo giá · Hợp đồng · Đơn bán hàng · Hóa đơn · Hỗ trợ**, cả chế độ Danh sách lẫn Kanban):
- Trang cao đúng 1 màn hình; phần trên (tiêu đề, tìm kiếm, thống kê, lọc) **đứng yên**.
- Chỉ vùng bảng cuộn; **hàng tiêu đề cột dính trên cùng** khi cuộn. Kanban cuộn trong khung bảng.
- Cách làm: đánh dấu `tblpage` (gốc trang) → `tblgrow` (các lớp bọc) → `tblbox` (khung bảng) bằng cách lần đúng chuỗi phần tử cha của danh sách dòng; CSS flex cột với `min-height:0`.
- An toàn: khung bảng tối thiểu 260px; màn quá thấp thì trang mới cuộn dự phòng. Mobile (≤900px) giữ cuộn cả trang như cũ cho dễ thao tác.

Chưa áp: Khách hàng thân thiết · Marketing · Gọi điện · Lịch hẹn — các trang này có nhiều khối khác ngoài bảng (luật tích điểm, KPI, lịch tuần/tháng), cần sắp lại bố cục trước.

---

## [2026-10-29] — Chuẩn hoá nút "Trợ lý AI" trên toàn app

Trước: 14 nút Trợ lý AI ở 13 màn dùng **5 kiểu khác nhau** — nền đen / xanh nhạt (Hộp thư) / tím nhạt (Báo giá); cao 34–38px; bo góc 8–11px; nhãn khi có khi không kèm tên module; 2 nút không bấm được (Hóa đơn và 1 màn khác).

Sau: **một kiểu duy nhất** (class `aibtn`) — nền mực `#231F20`, icon ✦ xanh brand `#2DC56A`, chữ trắng *"Trợ lý AI"*, cao 36px, bo 9px; hover đậm hơn. Tên module chuyển vào tooltip (VD *Trợ lý AI · Báo giá*) vì panel mở ra đã ghi rõ ngữ cảnh. Hai nút chết nay mở module Trợ lý AI.

Áp dụng: Hộp thư · Khách hàng · Báo giá · Hợp đồng · Đơn bán hàng · Hóa đơn · Hỗ trợ (Tickets) · Lịch hẹn · Marketing · Gọi điện · AI Agents · Quy trình.

---

## [2026-10-29] — Kênh kết nối: một kênh nhiều tài khoản (omnichannel)

**Sửa mô hình dữ liệu:** trước đây mỗi kênh = 1 tài khoản. Nay **mỗi kênh có nhiều tài khoản** (VD Zalo OA: *Spa Hương Sen* + *Shop Bé Na*; Facebook: 2 Page; Instagram: 2 tài khoản; Website Chat: 2 domain; Email: 2 hộp thư).
- Dữ liệu tài khoản theo kênh: `chanAcctSeed()` + `chanAcctAdds` (thêm mới) − `chanAcctDels` (ngắt) + `chanAcctEdits` (sửa). `effChannels()` tính trạng thái kênh từ tài khoản: *đã kết nối* khi có ≥1 tài khoản, sức khoẻ = tài khoản kém nhất, tổng hội thoại cộng dồn.
- Seed khớp đúng danh sách tài khoản trong bộ lọc Hộp thư, nên **bộ lọc "Tất cả tài khoản" ở Hộp thư giờ sinh ra từ chính dữ liệu kênh** — thêm/ngắt tài khoản ở Cài đặt là Hộp thư cập nhật theo.

**Kết nối = thêm tài khoản:**
- Kênh đã có tài khoản vẫn kết nối thêm được; tiêu đề luồng ghi *"Thêm tài khoản Zalo OA · đang có 2"*.
- Thẻ kênh trong popup Hộp thư hiện *"N tài khoản đã kết nối · bấm để thêm"*.
- Bước chọn trang (đăng nhập uỷ quyền) đánh dấu trang **đã kết nối**.
- Bước cấu hình nhanh đặt **tên tài khoản** (tự điền theo trang/email đã chọn).

**Quản lý = 2 cấp:**
1. **Danh sách tài khoản của kênh** — 3 số tổng (tài khoản · hội thoại 7 ngày · số tài khoản có AI) + từng tài khoản: tên, định danh, sức khoẻ, số hội thoại, AI Agent → *Quản lý ›*. Nút **+ Thêm tài khoản**.
2. **Chi tiết 1 tài khoản** — 6 khối cấu hình như cũ nhưng **riêng từng tài khoản** (AI Agent, phân công, SLA, đồng bộ). *Tạm dừng / Kết nối lại / Ngắt kết nối* chỉ tác động tài khoản đó; ngắt tài khoản cuối cùng thì kênh chuyển *Chưa kết nối*.
- Nút trên danh sách kênh ở Cài đặt hiện số tài khoản: *Quản lý (2)*.

---

## [2026-10-29] — Kết nối kênh: luồng dùng chung + màn Quản lý kênh

**Sửa lỗi:** nút *Quản lý* ở Cài đặt → Kênh kết nối trước đây **ngắt kênh ngay** (dùng chung hàm bật/tắt với *Kết nối*), và *Kết nối* nối ngay không qua xác thực. Nay cả 3 điểm vào (nút *Kết nối kênh* ở Hộp thư · nút *Kết nối/Liên kết* ở danh sách và dạng thẻ trong Cài đặt) đều đi qua `chanAction()`:
- Kênh **chưa nối** → mở luồng kết nối
- Kênh **đã nối** → mở màn Quản lý

**Luồng kết nối 3 bước** (một modal dùng chung, có stepper):
1. **Chọn kênh** — popup 13 kênh ở Hộp thư; trong Cài đặt bỏ qua bước này vì đã chọn sẵn
2. **Xác thực** — tự chọn theo loại kênh:
   - *Quét QR* (Zalo cá nhân, WhatsApp cá nhân) — mã QR + 3 bước hướng dẫn → *Tôi đã quét mã*
   - *Đăng nhập uỷ quyền* (Zalo OA, Facebook, Messenger, Instagram, Google, TikTok…) — nút *Đăng nhập với…*, nêu quyền yêu cầu → chọn trang cần kết nối
   - *Nhập thông tin* (Telegram · Email IMAP · Tổng đài SIP · Live chat · WhatsApp API · WeChat) — form theo từng kênh → *Kiểm tra kết nối* phải thành công mới tiếp tục được
3. **Cấu hình nhanh** — tên hiển thị · AI Agent · chế độ AI (*trả lời ngay · gợi ý người duyệt · tắt*) · phòng ban nhận · cách chia → *Hoàn tất kết nối*: kênh chuyển sang *Đã kết nối*, sức khoẻ *Khỏe*

**Màn Quản lý kênh** (drawer bên phải, 6 khối):
1. Tổng quan kết nối — tài khoản · người kết nối · ngày · đồng bộ cuối · hạn token; *Kiểm tra kết nối*, *Đồng bộ lại*
2. Hiệu suất 7 ngày — hội thoại mới · tin nhận/gửi · FRT · % AI tự xử lý · lỗi gửi tin
3. Trả lời tự động — AI Agent · chế độ AI · giờ hoạt động · tin chào mừng
4. Phân công & định tuyến — phòng ban · cách chia · chính sách SLA
5. Đồng bộ dữ liệu — bật/tắt tin nhắn · bình luận · đánh giá · tự tạo liên hệ; đồng bộ lịch sử 0/7/30/90 ngày
6. Vùng nguy hiểm — *Tạm dừng/Tiếp tục* · *Kết nối lại tài khoản khác* (mở lại bước xác thực) · *Ngắt kết nối* (hỏi xác nhận, giữ hội thoại cũ)

*Lưu thay đổi* cập nhật AI Agent hiển thị trên danh sách kênh và trạng thái tạm dừng.

---

## [2026-11-14] — Phạm vi D63: đồng bộ sàn Shopee + TikTok Shop

**Lý do:** DN dịch vụ có bán thêm qua sàn cần đơn sàn về AppChat (đơn, trạng thái, mã vận đơn, sản phẩm / giá / biến thể). Chỉ đồng bộ về — AppChat vẫn không vận hành gian hàng.

**Thay đổi:**
- Adapter thật **Shopee** (Open Platform v2) + **TikTok Shop** (Partner API VN) qua port `OrderSyncProvider` có sẵn (D31); kết nối bằng uỷ quyền sàn + chọn shop, nhiều shop / sàn mỗi workspace.
- Kéo đơn theo trang qua hàng đợi + webhook mức App; mã vận đơn chỉ đọc; đọc sản phẩm để ghép SKU (drawer Ghép SKU).
- Sửa lỗi đồng bộ có sẵn: vận đơn bị ghi đè bằng rỗng, khách / đơn trùng khi nối lại, ghép SKU bỏ qua ánh xạ, tồn biến thể không trừ (Q-916), một kết nối mỗi connector.
- Luật COMMERCE §4b giữ nguyên. Lazada / Sapo / KiotViet / Haravan / WooCommerce, đẩy tồn / trạng thái lên sàn, đăng sản phẩm, chat người mua, livestream sàn: vẫn "Sắp có" / P2.

**Ảnh hưởng:** 4 TIP mới (049 → 049d) sau 048h, GOAL-RELEASE 103 TIP. Cần đăng ký Shopee ISV (Q-914) + TikTok Shop Partner (Q-915) sớm.

---

## [2026-11-14] — Phạm vi D62: kênh Zalo OA / Facebook / Instagram / TikTok, bình luận, livestream, cô lập worktree

**Lý do:** Chủ nhà muốn ship các kênh webhook cùng bản phát hành (trước đây P2 — D04) và làm song song nhiều worktree.

**Thay đổi:**
- **Kênh mới có adapter thật:** Zalo OA (tin tư vấn ≤ 7 ngày), Facebook Page / Messenger, Instagram (gắn Page), TikTok Business Messaging (Beta). Kết nối bằng đăng nhập nền tảng (OAuth) + chọn Page / OA / tài khoản; một Page / OA chỉ thuộc một workspace.
- **Bình luận bài đăng** (Facebook / Instagram / TikTok) vào Hộp thư: trả lời công khai, nhắn riêng, ẩn, xoá, thích; AI agent trả lời thẳng như nhân viên (Q-911 chốt 2026-11-14).
- **Livestream** Facebook / Instagram: gom bình luận theo phiên, cờ ý mua / SĐT; người hoặc AI agent tạo khách + đơn, trả lời / nhắn riêng người bình luận.
- **Vẫn "Sắp có":** ZNS, WhatsApp, WhatsApp Business API, Telegram, LINE, Viber, WeChat; bình luận bài Zalo OA; live TikTok / Shopee; chat người mua trên sàn. Danh sách kênh ở mọi màn lấy từ registry (PD-903).
- **Hạ tầng thi công:** TIP-035d cô lập worktree (DB / cổng / Memurai / slot Postgres riêng) để ba luồng A (TIP cũ) / B (Gọi điện) / C (Kênh) chạy song song.
- **Kho token OAuth chung** (`oauth_grant` + `TokenVault`): một App Zalo cho kênh OA và Zalo Cloud Connect; TIP-047 / 047b / 047c / 047d sửa theo (DC-909).

**Ảnh hưởng:** 9 TIP mới (035d, 048 → 048h), GOAL-RELEASE 99 TIP. Tài nguyên cần nộp sớm: Meta Business Verification + App Review, App Zalo quyền OA API, TikTok Business Messaging, domain HTTPS (Q-908…910). Prototype chưa vẽ Hộp thư bình luận và màn livestream (PD-904, PD-905 — mức 2).

---

## [2026-11-12] — Prototype mới (bản 2026-11-10) thay ver2.1

**Nguồn:** `Team Work AppChat – AppChat.html` (bản đóng gói tự giải nén, lưu 2026-11-10). Bản gốc giữ nguyên ở `06-prototype/AppChat (standalone).html`; `AppChat.dc.html` là bản nguồn giải ra từ đó (support.js · font Google · `assets/appchat-symbol.png` dùng lại như cũ), đã chạy `normalize-prototype.mjs` (D44, 10.836 giá trị). Đo trên Playwright: bản giải ra khớp bản đóng gói ≤ 0,005% ở 14 màn.

**Màn / khối mới trong prototype:**
- **Tài chính** (`finance`, rail sau Khách hàng, badge 4) — doanh số & công nợ theo khách từ bán mới · gia hạn · marketing: 4 KPI (Doanh số · Đã thu · Còn nợ · Quá hạn), lọc đơn vị / hoạt động / mốc đếm ngày, chip trạng thái (Đã thu đủ · Đã cọc · Còn nợ · Quá hạn), bảng có số ngày còn lại / quá hạn và nhắc gần nhất.
- **Báo cáo** có lại mục trên rail (chỉ icon, sau Quy trình).
- **Cơ hội / Sales Pipeline** dùng chung mọi màn: thẻ trong Hồ sơ 360° (Hộp thư + Khách hàng) — giai đoạn, xác suất, dự báo, ngày dự kiến chốt, phụ trách, sản phẩm, báo giá liên quan, gợi ý AI bước tiếp theo, *Chuyển giai đoạn · Mở cơ hội*; drawer **Cơ hội 360°** (Mở lại · Đánh dấu Thua bắt buộc chọn lý do · Khách hàng 360° · cơ hội khác của khách · lịch sử).
- **Công nợ · Tài chính** trong Hồ sơ 360° — số còn nợ, thanh đã thu / cọc, hạn, *Gửi email nhắc · Xem ở Tài chính ›*.
- **Hẹn gọi lại** (modal dùng chung): thời điểm · người gọi · ghi chú.
- **Khách hàng**: bảng thêm cột *Cơ hội đang mở*; *Gửi Zalo ZBS* (Coming soon) cạnh *Gửi email*.
- **Cài đặt**: Tổng đài (lời chào & menu phím, nhóm nhận cuộc gọi, máy nhánh, ghi âm & giám sát), KPI theo cây tổ chức (mục tiêu quý · tổng cấp dưới · chia đều), Vai trò (*Sửa & phân quyền · Nhân bản · Xoá*).

**Ảnh hưởng:**
- Baseline parity dịch theo bản mới: phần lớn màn ~0,2% (rail thêm 2 mục), **Hộp thư ~6,6%** và **Khách hàng ~3,7%** (thẻ Cơ hội / Công nợ trong Hồ sơ 360°, cột mới) — các màn này cần đo lại `pnpm parity` trên app.
- Màn ẩn theo V2 (Quy trình · Báo cáo; Gọi điện vào phạm vi từ 2026-11-13 — D61) và phạm vi module vẫn theo Blueprint §7 / D-quyết định hiện hành; prototype mới **không** ghi đè D42 (D43).
- **Phạm vi (2026-11-12, D60 / Q-901):** Cơ hội / Sales Pipeline → TIP-026c (thay `contact_opportunity` 026b, sửa COMMERCE §8), Tài chính → TIP-032e (sửa COMMERCE §5); cả hai trước TIP-046. Kanban Pipeline làm sau; Hẹn gọi lại làm cùng Gọi điện (TIP-047d).
- **Phạm vi (2026-11-13, D61 / RRI Gọi điện):** Gọi điện / Call Center vào bản phát hành (đảo D07 phần Call Center): TIP-047 hạ tầng voice (LiveKit + SIP edge tự dựng, không Docker) → 047b schema / quyền / gói → 047c backend (LiveKit / Zalo Cloud Connect / hotline / SĐT cá nhân, gọi nhỡ → việc gọi lại, ghi âm 12 tháng, Voice AI) → 047d giao diện (màn L4775, WebPhone, Hẹn gọi lại L2835, Cài đặt Tổng đài L8173); trước TIP-044. Nút "Cuộc gọi đến (demo)", codec G.729, thiết bị Softphone / IP Phone / Mobile app của prototype không làm (PD-902).

---

## [2026-10-27] — Cài đặt → Phòng ban: tạo · cấu hình · xoá · xem thành viên

Trước đây 3 nút trên trang Phòng ban không có hành động. Nay:
- **Tạo phòng ban** — form: tên (bắt buộc, chặn trùng tên) · chi nhánh · khối · trưởng phòng · màu nhận diện (8 màu) · mô tả. Phòng mới hiện ngay trong lưới thẻ.
- **Cấu hình** (trên từng thẻ) — mở cùng form với dữ liệu sẵn, *Lưu thay đổi*; có nút **Xoá phòng ban** (hỏi xác nhận).
- **Thành viên** (trên từng thẻ) — chuyển sang chế độ *Danh sách nhân sự* và lọc đúng phòng đó.
- Sửa/xoá áp được cả cho phòng có sẵn lẫn phòng mới tạo; mỗi phòng có khoá riêng nên đổi tên rồi sửa tiếp vẫn đúng bản ghi.

## [2026-10-27] — Trợ lý AI widget: bổ sung kiến thức bằng kéo thả tệp

"+ Bổ sung vào Agent" bỏ 3 tab Tài liệu/Website/Hỏi–đáp, chỉ còn **vùng kéo thả tệp** (hoặc bấm chọn tệp, nhiều tệp cùng lúc; PDF · DOCX · XLSX · TXT · CSV). Tệp đã chọn hiện danh sách kèm định dạng + dung lượng, xoá được từng tệp; nút **Lưu N tệp vào kiến thức** đưa tệp vào nguồn kiến thức của Agent và bật sẵn.

---

## [2026-10-27] — Tác vụ tự chủ (Coworks): form tạo tác vụ

Nút **"Tạo agent"** trong tab Coworks trước đây không có hành động → đổi thành **"Tạo tác vụ tự chủ"** và mở form tạo:
- **Tên tác vụ** · **Mục tiêu nhiệm vụ** (mô tả từng bước) — kèm 3 mẫu nhanh: Báo cáo doanh thu tuần · Dọn dữ liệu khách trùng · Nhắc công nợ quá hạn
- **Phòng ban** — Marketing · Kinh doanh · CSKH · Vận hành · Tài chính
- **Dữ liệu được cấp quyền** — Khách hàng · Đơn hàng · Báo giá · Hóa đơn · Hội thoại · Tệp trong Cloud (AI chỉ đọc/ghi trong phạm vi chọn, chạy cách ly)
- **Công cụ được phép** — Đọc dữ liệu · Tạo/sửa bản ghi · Gửi tin nhắn · Tạo file báo cáo · Gửi email
- **Cách chạy** — Chạy ngay · Theo lịch · Khi có sự kiện; **Model** — Haiku 4.5 / Sonnet 4.5
- **Kiểm soát** — hỏi xác nhận trước khi xoá (luôn bật), hỏi trước khi gửi ra ngoài (bật/tắt), giới hạn credit mỗi lần chạy

Nút lưu chỉ bật khi có tên + mục tiêu; tác vụ mới thêm vào đầu danh sách Coworks kèm thông báo.

---

## [2026-10-27] — Đổi tên "Web Widget Studio" → "Trợ lý AI"

- Thẻ trong Cài đặt → Nền tảng kết nối (nhóm *Kênh & Studio*) đổi tên thành **Trợ lý AI**, mô tả: *Dùng AI để trả lời khách hàng trên website — nhúng khung chat, chọn AI Agent trực, tông giọng và thông tin cần thu thập.*
- Tiêu đề trang cấu hình khi mở thẻ cũng đổi theo. Chức năng bên trong giữ nguyên.

---

## [2026-10-27] — Nền tảng kết nối: thêm Google Cloud Storage

- Thêm thẻ **Google Cloud Storage** vào nhóm *Năng suất* trong Cài đặt → Nền tảng kết nối, ngay sau Cloud Storage. Mô tả: kết nối bucket GCS để lưu tệp, media & backup, xác thực bằng Service Account. Bấm **Kết nối** mở popup kết nối chung như các tích hợp khác.
- Logo dạng chữ `GCS` màu `#4285F4`.
- Sửa mô tả thẻ **Cloud Storage** cho khớp quyết định trước đó (chỉ AppChat Cloud) — bỏ cụm "S3 / Google Drive / Dropbox".
- Sau đó **xoá hẳn thẻ Cloud Storage** khỏi Nền tảng kết nối theo yêu cầu; nhóm Năng suất còn Google Cloud Storage và Google Sheets. Trang cấu hình AppChat Cloud vẫn giữ trong code nhưng không còn lối vào từ trang này.

---

## [2026-10-26] — Ô tìm kiếm trong từng trang của submenu Khách hàng

Làm rõ yêu cầu: tìm kiếm nằm **trong từng trang**, không phải trong flyout sidebar → gỡ ô tìm trong flyout, giữ flyout là danh sách 7 mục như cũ.

Trạng thái tìm kiếm của 7 trang (tất cả không phân biệt dấu):
| Trang | Trước | Sau |
|---|---|---|
| Khách hàng | Ô có sẵn nhưng **không lọc** | Lọc theo tên · email · SĐT · chức danh · Zalo · thành phố |
| Sản phẩm | Đã hoạt động | Giữ nguyên |
| Báo giá | Đã hoạt động | Giữ nguyên |
| Hợp đồng | Đã hoạt động | Giữ nguyên |
| Đơn bán hàng | Đã hoạt động | Giữ nguyên |
| Hóa đơn | Ô có sẵn nhưng **không lọc** | Lọc theo mã · khách · nội dung · giá trị · người lập |
| Khách hàng thân thiết | Ô có sẵn nhưng **không lọc** | Lọc theo tên · SĐT (có/không dấu cách) · hạng · trạng thái |

---

## [2026-10-26] — Ô tìm kiếm trong submenu Khách hàng (sidebar)

Flyout **Khách hàng & CRM** thêm ô *Tìm mục…* ở đầu danh sách. Gõ để lọc 7 mục (Khách hàng · Sản phẩm · Báo giá · Đơn bán hàng · Hóa đơn · Hợp đồng · Khách hàng thân thiết); tìm không phân biệt dấu (gõ "hoa don" vẫn ra *Hóa đơn*). Không khớp mục nào thì hiện *Không có mục phù hợp*. Chọn một mục thì ô tìm tự xoá.

---

## [2026-10-26] — Bỏ panel Hồ sơ 360° ở 5 module

Tắt panel chi tiết bên phải của **Sản phẩm & dịch vụ · Đơn bán hàng · Hóa đơn · Hợp đồng · Khách hàng thân thiết** — click vào dòng không còn mở panel, các trang chỉ còn bảng danh sách full width.
- Giữ nguyên panel 360° của **Khách hàng** và **Báo giá**.
- Cách làm: cờ hiển thị `pdDetailOn · odDetailOn · ivDetailOn · ctDetailOn · lyDetailOn` cố định `false`; mã panel vẫn giữ trong file để có thể bật lại khi cần.

---

## [2026-10-26] — Chuẩn hoá tab Hồ sơ 360° — Sản phẩm

Sản phẩm từ *Tổng quan · Lịch sử · AI* → bộ chuẩn **Tổng quan · CRM · AI · Tệp · Lịch sử**:
- **CRM** (mới) — hiệu quả bán hàng (khách đã mua · doanh thu 30 ngày · báo giá đang mở · đơn chờ giao), khách mua nhiều nhất, lối sang Báo giá / Đơn bán hàng / Hóa đơn có sản phẩm này
- **Tệp** (mới) — ảnh, video hướng dẫn, thông số kỹ thuật, bảng giá sỉ (kèm nguồn đồng bộ) + *Tải tệp lên*
- Đảo thứ tự AI lên trước Lịch sử cho khớp các module khác

---

## [2026-10-26] — Chuẩn hoá tab Hồ sơ 360° — Đơn bán hàng · Hóa đơn · Hợp đồng · Khách hàng thân thiết

Cả 4 module dùng chung **một bộ 5 tab**: **Tổng quan · CRM · AI · Tệp · Lịch sử** (thứ tự cố định, cùng style).

| Module | Trước | Thay đổi |
|---|---|---|
| Hợp đồng | Tổng quan · CRM · AI · Lịch sử | + tab **Tệp** (hợp đồng ký số, phụ lục, giấy tờ đại diện) |
| Đơn bán hàng | Tổng quan · CRM · AI · Lịch sử | + tab **Tệp** (phiếu xác nhận, bill, biên bản giao) |
| Hóa đơn | Tổng quan · Thanh toán · AI · Lịch sử | *Thanh toán* gộp vào **Tổng quan**; + **CRM** (chỉ số khách hàng + chứng từ liên quan: đơn, hợp đồng, báo giá); + **Tệp** |
| Khách hàng thân thiết | Tổng quan · Lịch sử điểm · Quy tắc | *Quy tắc* chuyển vào **CRM**; *Lịch sử điểm* → **Lịch sử**; + **AI** (phân tích thành viên + gợi ý ưu đãi, nhắc điểm hết hạn, giới thiệu bạn bè); + **Tệp** |

Tab **Tệp** dùng chung một mẫu: danh sách tệp (nhãn định dạng màu, nguồn, ngày) + nút *Tải tệp lên*.

---

## [2026-10-26] — Hồ sơ 360° cho Hóa đơn (hoàn thiện bộ 360 nhóm Khách hàng & CRM)

**Rà soát:** Báo giá · Hợp đồng · Đơn bán hàng · Sản phẩm · Khách hàng thân thiết **đã có** panel 360° (bấm vào dòng để mở). Chỉ **Hóa đơn** còn thiếu → bổ sung.

**Hồ sơ hóa đơn 360°** — bấm vào dòng hóa đơn để mở panel trượt bên phải, 4 tab:
- **Tổng quan** — mã hóa đơn, trạng thái, khách hàng (+ lối sang hồ sơ KH), nội dung, ngày phát hành, hạn thanh toán, tổng tiền; thanh tiến độ thu tiền (đã thu / còn lại); nút *Ghi nhận thanh toán* · *Gửi nhắc ZBS*
- **Thanh toán** — các khoản đã thu (kênh, ngày, đối soát)
- **AI** — dự báo khả năng thanh toán / rủi ro nợ theo trạng thái, kèm gợi ý hành động (nhắc công nợ, giao AI Agent nhắc nợ, tạo ticket thu hồi, gợi ý gia hạn)
- **Lịch sử** — dòng thời gian tạo · gửi · nhắc · thu tiền

---

## [2026-10-26] — Hồ sơ 360° nhóm: làm lại theo kiểu Zalo "Thông tin nhóm"

Bỏ 5 tab, thay bằng **một trang cuộn dọc**, các khối ngăn bằng dải xám như Zalo:
1. **Đầu trang** — ảnh nhóm, tên nhóm (bút sửa), 4 nút tròn: *Tắt thông báo · Ghim hội thoại · Thêm thành viên · Quản lý nhóm*
2. **Thành viên** — "24 thành viên" kèm phân loại; bấm để mở danh sách (nút *Hồ sơ* / *+ Tạo liên hệ*) · **Link tham gia nhóm**
3. **Bảng tin nhóm** — Tin nhắn đã ghim · Ghi chú nội bộ
4. **Ảnh/Video** — lưới 4 cột + *Xem tất cả*
5. **File** — danh sách + *Xem tất cả*
6. **Link** — danh sách liên kết
7. **AI trong nhóm** (thu gọn mặc định) — AI CSKH + chế độ *Khi được @ · Tự động · Tắt*, Quy định nhóm cho AI, Đồng bộ nhóm
8. **Cuối trang** — Ẩn trò chuyện · Xoá lịch sử (đỏ) · Rời nhóm (đỏ)

Mỗi khối có mũi tên thu gọn/mở; Ảnh, File, Link mở sẵn, Thành viên và AI thu gọn sẵn. Phần AI giữ lại nhưng đưa xuống dưới để trang nhìn giống ứng dụng chat quen thuộc. Thêm 5 icon mới vào sprite: edit · link · pin · user-plus · logout.

---

## [2026-10-26] — Hồ sơ 360°: tab Tệp & Liên kết · Quy định nhóm · Kênh & đồng bộ

**Tab "Tệp" mới** — có ở cả Hồ sơ 360° nhóm và Hồ sơ 360° cá nhân (Hộp thư + trang Khách hàng). Gộp thành một tab có bộ lọc chip *Tất cả · Tệp · Ảnh · Liên kết · Ghim · Ghi chú* (kèm số lượng) vì panel 380px không đủ chỗ cho nhiều tab:
- **Tin đã ghim** — tin quản trị/nhân viên ghim, xếp đầu
- **Tệp tin** — tên, người gửi, ngày, dung lượng, nhãn định dạng màu; AI nhận diện loại tệp và gợi ý hành động (*Lưu vào Knowledge Base*, *Gắn hợp đồng*, *Gửi lại*)
- **Ảnh & Video** — lưới 4 cột, gồm cả bill chuyển khoản, voice note
- **Liên kết** — tiêu đề, URL, người chia sẻ
- **Ghi chú nội bộ** — đánh dấu *Khách không thấy*

Riêng hồ sơ cá nhân có trạng thái **Đã xem / Chưa xem** cho tệp nhân viên đã gửi khách.

**Tab Tổng quan của nhóm — thêm 2 khối:**
- **Quy định nhóm** — luật AI phải đọc trước khi trả lời trong nhóm (không báo giá công khai, khiếu nại chuyển người, cách xưng hô, giờ trả lời). Có nút *Sửa*. Lý do: cùng một AI CSKH nhưng mỗi nhóm cần cách cư xử khác nhau.
- **Kênh & đồng bộ** — kênh, tài khoản kết nối, quyền của tài khoản trong nhóm, lần đồng bộ cuối + trạng thái; nút *Đồng bộ lại* và *Quản lý kênh*. Lý do: phát hiện ngay khi nhóm bị ngắt kết nối thay vì tưởng nhóm im lặng.

---

## [2026-10-26] — Hộp thư: hội thoại nhóm + Hồ sơ 360° nhóm

**Danh sách hội thoại** — thêm 2 hội thoại nhóm (Nhóm VIP Spa Hương Sen · Zalo, Cộng đồng Đại lý miền Bắc · Facebook): avatar xếp chồng, nhãn **Nhóm · N thành viên**, xem trước tin có tên người gửi, badge số câu chưa trả lời. Dòng đang chọn tô xanh theo state (trước đây cố định ở hội thoại cá nhân).

**Khung chat nhóm** — header hiện số thành viên/online/kênh; tin nhắn ghi tên từng thành viên; tin AI ghi rõ *"trả lời @tên"*; cảnh báo khi có câu hỏi chưa ai trả lời.

**Hồ sơ 360° · Nhóm** — 4 tab, thay cho hồ sơ cá nhân khi chọn hội thoại nhóm:
- **Tổng quan** — thông tin nhóm (kênh, ngày tạo, quản trị), 3 chỉ số (thành viên · tin 7 ngày · chưa trả lời); AI tóm tắt (cảm xúc + chủ đề nổi bật); **Việc cần xử lý** với nút nghiệp vụ (Tạo báo giá · Đặt lịch hẹn · Tạo ticket) + *Giao AI*; **AI trong nhóm** — agent phụ trách và chế độ trả lời *Khi được @ · Tự động · Tắt*.
- **Thành viên** — phân loại Nhân viên / Khách hàng / Chưa có hồ sơ; mỗi người có vai trò, số tin, và nút *Hồ sơ* hoặc *+ Tạo liên hệ* (biến thành viên nhóm thành khách hàng trong CRM).
- **AI** — cơ hội bán hàng phát hiện trong nhóm (kèm % khả năng), tín hiệu rủi ro, gợi ý bài đăng vào nhóm.
- **Lịch sử** — dòng thời gian sự kiện của nhóm (thành viên vào, AI trả lời, ticket phát sinh, thông báo đã gửi).

**Nguyên tắc:** nhóm không phải một khách hàng — hồ sơ nhóm tập trung vào *ai trong nhóm cần xử lý* và *cơ hội phát sinh từ nhóm*, mỗi thành viên vẫn liên kết về hồ sơ 360° cá nhân của họ.

---

## [2026-08-29] — Đặc tả trial 15 ngày (phương án C) — hoàn chỉnh nghiệp vụ

**Khởi tạo:** đăng ký thành công → tạo workspace → tự kích hoạt trial **Cá nhân Pro 15 ngày** → ghi nhận ngày bắt đầu (`ac_trialstart`), ngày kết thúc (tính +15 ngày), số ngày còn lại (`ac_trialdays`) → vào workspace.

**Màn chào mừng lần đầu** — hiện đến khi người dùng bấm *Bắt đầu dùng thử*:
- Nêu rõ *"Bạn có 15 ngày trải nghiệm gói Cá nhân Pro"* và **ngày hết hạn cụ thể** (dd/mm/yyyy)
- Cảnh báo: hết hạn tự chuyển về gói Miễn phí, dữ liệu giữ nguyên
- Chỉ **hai nút**: *Xem bảng giá* · *Bắt đầu dùng thử*. Không có nút đóng, bỏ qua, hay dùng gói Miễn phí.

**Sửa 2 lỗi nghiệp vụ so với bản đầu:**
1. *Xem bảng giá* trước đây **đánh dấu hoàn thành** màn chào mừng → nay chỉ mở popup bảng giá; đóng popup thì **quay lại màn chào mừng**, đúng đặc tả. Thoát app trước khi bấm *Bắt đầu dùng thử* thì lần sau màn chào mừng vẫn hiện.
2. Popup hết hạn trước đây **chặn toàn bộ app** → mâu thuẫn với nghiệp vụ tự hạ về gói Miễn phí. Nay là **thông báo đóng được** (nút ✕ + click nền), người dùng vẫn đăng nhập và dùng trong giới hạn gói Miễn phí. "Khoá app" hiểu đúng là **khoá quyền dùng tính năng Pro**.

**Trong thời gian trial:**
- **Badge trạng thái trên sidebar** — *"Trial Cá nhân Pro · Còn X ngày"* (xanh brand), click mở bảng giá. Hết hạn đổi thành *"Gói Miễn phí"* (xám); đã thanh toán đổi thành tên gói (xanh dương).
- Banner trong popup bảng giá + badge **ĐANG DÙNG THỬ** trên thẻ Cá nhân Pro, nút không bấm được.
- Thanh toán một gói → `endTrialWithPlan()` kết thúc trial, chuyển sang gói đã mua, ẩn mọi thông báo trial.

**Cờ localStorage:** `ac_trialstart` · `ac_trialdays` · `ac_trialseen` · `ac_expiredseen` · `ac_paidplan`.

---

## [2026-08-29] — Dùng thử 15 ngày: màn chào mừng, banner trial, khoá khi hết hạn

**Luồng mới sau đăng ký:** đăng ký 3 bước → popup khai báo bắt buộc 2 bước → **màn chào mừng trial (một lần)** → workspace.

**Màn chào mừng** (`trialWelcome`, hiện một lần theo cờ `ac_trialseen`):
- Hero gradient brand + badge *GIẢI PHÁP ONE-PERSON COMPANY*
- Khối nổi bật **15 ngày dùng thử miễn phí** — gói **Cá nhân Pro**, mở hết tính năng, không cần thẻ
- 4 dòng nêu rõ được gì: kênh không giới hạn · toàn bộ AI Agents · CRM đầy đủ · quy trình + 10.000 credit
- Hai nút: **Bắt đầu dùng thử** (vào workspace) · **Xem bảng giá** (mở popup bảng giá đã có)
- Không có nút bỏ qua — theo quyết định: không cho chọn gói Miễn phí ngay từ đầu

**Banner trial trong popup Nâng cấp** — *"Bạn đang dùng thử Cá nhân Pro — còn N ngày"*, kèm ô số ngày và thanh tiến trình theo tỉ lệ còn lại.

**Thẻ gói Cá nhân Pro khi đang trial** — badge **ĐANG DÙNG THỬ** thay cho *Phổ biến nhất*, viền + ring xanh brand, nút đổi thành *"Đang dùng thử · còn N ngày"* (không bấm được, không mở checkout).

**Hết 15 ngày** (`trialDaysLeft <= 0`) — popup **chặn toàn màn** (z-index 2200), không có nút đóng:
- Nêu rõ workspace **tạm khoá** và đã **chuyển về gói Miễn phí**
- 4 dòng liệt kê những gì bị khoá (hộp thư ngưng nhận tin · AI Agents dừng · còn 1 kênh/1 agent/500 credit · báo cáo + quy trình khoá)
- Nút **Nâng cấp ngay** mở popup bảng giá; trấn an dữ liệu được giữ nguyên

**Nguyên tắc:** dùng lại **đúng** popup bảng giá đã có (`upgradeOpen`) ở cả hai điểm vào — không tạo màn bảng giá thứ hai, tránh hai nguồn sự thật về giá.

**Cờ localStorage bổ sung:** `ac_trialseen` (đã xem màn chào mừng) · `ac_trialdays` (số ngày còn lại, mặc định 15).

---

## [2026-08-26] — Đổi ngữ cảnh: "nền tảng" → "giải pháp" One-Person Company

**Câu định vị chuẩn (cập nhật):**
> AppChat là **giải pháp** One-Person Company (OPC), giúp một người xây dựng, vận hành và phát triển doanh nghiệp với đội ngũ AI Agents.

**Lý do:** "nền tảng" (platform) nghe như hạ tầng kỹ thuật, đặt AppChat vào cùng khung so sánh với các platform khác. "Giải pháp" (solution) đặt trọng tâm vào việc **giải quyết bài toán vận hành** của người chủ doanh nghiệp — đúng với cách khách hàng OPC nghĩ khi đi tìm.

**Lockup tiếng Anh:** `APPCHAT — The One-Person Company Solution` (trước: *…Platform*).

**Phạm vi đã cập nhật** — 15 tài liệu `.dc.html` + bản standalone:
- App (eyebrow đăng nhập, hero, splash logo), Document Index, Positioning System
- Master Deck · Portfolio (+ bản in) · Card Visit
- Brand Strategy · Brand Guideline · Core Identity · Marketing Identity
- Marketing Strategy Framework · Marketing Execution Plan
- SDD · Solution Design v1.1 · UIUX Architecture

Bao gồm cả các biến thể: *nền tảng OPC* → *giải pháp OPC*, *phần mềm OPC* → *giải pháp OPC*, *nền tảng vận hành doanh nghiệp một người* → *giải pháp vận hành…*, và nhóm từ khóa trong hệ thống keyword.

---

## [2026-08-21] — Hệ thống định vị 3 tầng: sở hữu category One-Person Company

**Quyết định chiến lược:** không cạnh tranh trong category *AI Agent Platform* / *AI Automation Platform* (đã đông, đã có người chiếm). Thay vào đó **sở hữu category mới: One-Person Company Platform**.

**Ba tầng định vị** — dùng cho ba mục đích, không thay thế nhau:

| Tầng | Nội dung | Dùng ở đâu |
|---|---|---|
| **1 · Category** | AppChat là nền tảng One-Person Company (OPC). | Tiêu đề, slide bìa, câu trả lời "AppChat là gì" |
| **2 · Định nghĩa** | AppChat là nền tảng One-Person Company (OPC), giúp một người xây dựng, vận hành và phát triển doanh nghiệp với đội ngũ AI Agents. | Website, profile, proposal, tài liệu sản phẩm |
| **3 · Thông điệp** | Một người. Một doanh nghiệp. Vận hành bằng AI.<br>*One Person. One Company. Powered by AI.* | Quảng cáo, standee, backdrop, social, video |

**Lockup thống nhất:** `APPCHAT — The One-Person Company Platform`

**Kiến trúc logic 5 tầng (không đảo thứ tự):**
`OPC (mô hình)` → `AppChat (nền tảng vận hành)` → `AI Agents (đội ngũ thực hiện)` → `Automation + Knowledge + Data + Channels (hạ tầng)` → `Sales · Marketing · CSKH · Operations · Finance · HR`

**Nguyên tắc khoá truyền thông — không nói "AI" chung chung.** Trục nội dung: *Nỗi đau doanh nghiệp → Giải pháp AI Agents → Cách giải quyết → Hiệu quả → Giải pháp OPC kết nối AI Agents theo phòng ban.*
- **Bỏ keyword:** AI doanh nghiệp · AI nhân sự · AI Marketing · nền tảng AI · AI Agent Platform.
- **Dùng keyword:** AI Agents bán hàng · tư vấn khách hàng · chốt đơn · chăm sóc khách hàng · nhắc công nợ · quản lý đơn hàng · theo dõi dòng tiền · giao việc · báo cáo lãnh đạo.
- Mọi tiêu đề, keyword, bài báo chí và SEO phải trả lời được: *AI Agents giải quyết vấn đề gì của doanh nghiệp?*

**Bổ sung từ Chiến lược 180 ngày (22/08/2026):**
- **Cảnh báo tên thương hiệu** — không dùng "OPC" đứng riêng trong tiêu đề chính (nhầm với Dược phẩm OPC); luôn viết đủ *Doanh nghiệp Một Người – One Person Company (OPC)*, chỉ rút gọn ở thân bài.
- **Công thức đặt tiêu đề** — `Nút thắt + AI Agent giải quyết + Kết quả mong muốn`, kèm 4 ví dụ chuẩn.
- **Hệ thống từ khóa 10 nhóm** — Category · Giải pháp · Vận hành · Bán hàng · CSKH · Điều hành · Tài chính · Đối tượng · Chính sách · Chuyển đổi. Áp dụng thống nhất trên mọi điểm chạm (báo chí, video, social, tên sự kiện, bài phát biểu, tài liệu đào tạo, trang đối tác, quảng cáo) — là chiến lược ngôn ngữ, không phải chiến lược website.
- **Phân bổ nội dung** — 35% nỗi đau & giải pháp · 25% giáo dục category · 25% bằng chứng · 10% hợp tác · **5% tính năng** (con số cố ý: không bán AI, không bán tính năng).
- **Trục truyền thông category** — WHY NOW → WHAT → HOW → PROOF → SYSTEM → SCALE.

**Đã cập nhật:**
- **App** — màn đăng nhập bổ sung slogan Tầng 3 dưới định nghĩa; splash logo `ONE-PERSON COMPANY PLATFORM`.
- **Brand Promise** đổi từ *"Giúp mỗi người… bằng AI"* → *"Giúp một người xây dựng, vận hành và phát triển doanh nghiệp với đội ngũ AI Agents"* (Brand Strategy · UIUX Architecture · standalone-src).
- **Tài liệu mới** `AppChat-Positioning-System.dc.html` — 7 mục: ba tầng · kiến trúc logic (sơ đồ) · nguyên tắc khoá + bảng keyword nên/không nên · lockup nhận diện · bảng áp dụng 9 điểm chạm · lộ trình rút gọn 3 giai đoạn · 4 sai số cần tránh.

---

## [2026-08-21] — Form tạo sản phẩm: Loại sản phẩm · danh mục tại chỗ · trường riêng

**Vấn đề:** form cũ trộn lẫn "danh mục" với "loại sản phẩm" — một select duy nhất (Liệu trình/Combo/Gói năm/Dịch vụ lẻ/Sản phẩm) vừa dùng để phân loại vừa quyết định bản chất sản phẩm, nên không phục vụ được nhiều ngành.

**Tách thành 4 trục độc lập:**
1. **Loại sản phẩm** — quyết định *hành vi* và field nào hiện ra.
2. **Danh mục** — chỉ để sắp xếp & báo cáo, người dùng tự tạo.
3. **Thuộc tính & biến thể** — giữ nguyên như cũ.
4. **Kênh bán** — giữ nguyên (đồng bộ kênh).

**6 Loại sản phẩm** với khối field riêng tự hiện/ẩn:
| Loại | Khối field riêng |
|---|---|
| Hàng vật lý | Mã SKU · Tồn kho · Giá vốn |
| Dịch vụ | Thời lượng · Nhân sự thực hiện · Giá vốn |
| Combo / Bundle | Bảng sản phẩm con + số lượng (thêm/xoá dòng) |
| Thẻ · Liệu trình | Số buổi · Hạn dùng · Giá mỗi buổi |
| Kỹ thuật số | (không có khối riêng) |
| Cho thuê | Đơn vị thời gian · Tiền đặt cọc · Số lượng sẵn có |

Mỗi loại có dòng gợi ý ngắn dưới select để người dùng chọn đúng.

**Tạo danh mục ngay trong form** — nút `＋` cạnh select mở ô nhập, gõ tên → **Tạo** → danh mục vào danh sách và được chọn luôn, kèm toast xác nhận. Không phải rời form sang Cài đặt.

**Khối "Trường dữ liệu riêng"** — đọc trực tiếp từ `cfData.products` (các trường không phải hệ thống, có bật *form*). Nút **+ Thêm trường** mở đúng modal Custom Fields với module `products`. Khi chưa có trường nào, hiện gợi ý giải thích để người dùng biết dùng vào việc gì. Đây là cách phủ mọi ngành mà không cần dựng preset riêng cho từng ngành.

---

## [2026-08-14] — Marketing: chiến dịch khởi tạo từ phân tích AI

**Bỏ trường "Nhập mục tiêu chiến dịch".** Topbar nay có 2 nút: **AI phân tích dữ liệu khách hàng** (chính) và **Tạo chiến dịch thủ công** (phụ), cùng nút icon ✦ mở panel Trợ lý AI · Marketing.

**Luồng 7 bước:** Danh sách chiến dịch → AI phân tích → Đề xuất cơ hội → Chọn đề xuất → AI tạo sẵn chiến dịch → Kiểm tra & điều chỉnh → Gửi thử / lên lịch / gửi ngay.

**Bước phân tích** — hiện tiến trình kèm 12 nhóm tín hiệu: hồ sơ · nhãn · lịch sử mua · sản phẩm quan tâm · lịch sử tương tác · thời gian tương tác cuối · giá trị & tần suất · báo giá/hợp đồng/đơn · lịch sử nhận chiến dịch · tỷ lệ mở & nhấp · tỷ lệ phản hồi · kênh thường dùng.

**Bảng đề xuất 7 cột** — Ưu tiên (Cao / Trung bình) · Chiến dịch · Nhóm khách hàng · Số lượng · Lý do đề xuất · Kênh · Thời điểm. 4 đề xuất mẫu: Tái kích hoạt (540) · Bán thêm (1.250) · Chuyển đổi (320) · Chăm sóc sau mua (680).

**Màn chi tiết** — khối "Đề xuất của AI", 7 trường thông tin, dự báo tỷ lệ phản hồi, chip tín hiệu đã dùng, 5 hành động (Tạo chiến dịch từ đề xuất · Xem danh sách khách · Điều chỉnh điều kiện lọc · Loại bỏ khách hàng · Yêu cầu AI phân tích lại).

**Tạo từ đề xuất** — wizard mở ra đã điền **11 trường** (tên · loại · nhóm nhận · loại trừ · kênh · ngày giờ · tiêu đề · nội dung · CTA · A/B Testing · KPI dự kiến), kênh tick sẵn, số người nhận đúng theo đề xuất, kèm khối xanh "AI đã điền sẵn — kiểm tra & phê duyệt".

**Tài liệu:** `AppChat-Marketing-Spec.dc.html` — 8 mục gồm flowchart, 12 nhóm tín hiệu, bảng đề xuất, chi tiết đề xuất, 11 trường tự điền, 6 tính năng bổ sung đề xuất, bảng 10 module liên kết, 4 quy tắc thiết kế.

---

## [2026-08-11] — Chốt định vị cốt lõi: Nền tảng One-Person Company (OPC)

**Câu định vị ngắn (category statement):**
> AppChat là nền tảng One-Person Company (OPC).

**Định nghĩa đầy đủ:**
> AppChat là nền tảng One-Person Company (OPC), giúp một người xây dựng, vận hành và phát triển doanh nghiệp với đội ngũ AI Agents.

**Thay đổi so với bản trước:** câu cũ *"Nền tảng AI Agents vận hành Doanh nghiệp Một Người"* đặt công nghệ (AI Agents) ở vị trí danh mục. Câu mới đặt **One-Person Company** làm category AppChat sở hữu, còn AI Agents lùi về đúng vai trò là **phương tiện** ("với đội ngũ AI Agents").

**Phạm vi đã cập nhật:**
- **App** `AppChat.dc.html` — eyebrow màn đăng nhập, mô tả hero, phụ đề logo splash (`ONE-PERSON COMPANY PLATFORM`).
- **10 tài liệu `.dc.html`** — Master Deck · Portfolio (+ bản print) · Brand Strategy · Brand Guideline · Marketing Identity · Marketing Strategy Framework · SDD · Solution Design v1.1 · UIUX Architecture.
- **Giữ nguyên** các dòng change-log lịch sử trong `uploads/` — đó là bản ghi quyết định cũ, không phải định vị đang dùng.

---

## [2026-07-26] — Tách **Hóa đơn** thành module độc lập

- Submenu Khách hàng nay có **7 mục**: Khách hàng → Sản phẩm → Báo giá → **Hợp đồng** → Đơn bán hàng → **Hóa đơn** → Khách hàng thân thiết.
- **Hoàn nguyên** module Hợp đồng về đúng tên cũ (trước đó bị rename nhầm thành Hóa đơn): tiêu đề, thẻ thống kê, CTA, cột bảng, panel AI, toast.
- **Thêm mới** trang Hóa đơn (`invoices`) độc lập: 4 thẻ thống kê (Tổng hóa đơn · Đã thu · Chờ thu · Quá hạn), ô tìm kiếm, CTA *Tạo hóa đơn*, nút *Trợ lý AI · Hóa đơn*, bảng 7 cột với 4 trạng thái (Đã thanh toán · Đã gửi · Quá hạn · Nháp).
- Hợp đồng và Hóa đơn là hai nghiệp vụ khác nhau nên tách riêng thay vì đổi tên.

---

## [2026-07-26] — Sắp xếp lại & đổi tên submenu Khách hàng

Thứ tự mới trong flyout **Khách hàng & CRM** (theo vòng đời bán hàng):

| # | Tên mới | Tên cũ |
|---|---|---|
| 1 | Khách hàng | Liên hệ |
| 2 | Sản phẩm | Sản phẩm *(chuyển lên vị trí 2)* |
| 3 | Báo giá | Báo giá |
| 4 | Đơn bán hàng | Đơn hàng |
| 5 | Hóa đơn | Hợp đồng |
| 6 | Khách hàng thân thiết | Loyalty |

**Phạm vi rename "Hợp đồng → Hóa đơn"** (hoàn tất trong module hợp đồng): nhãn flyout · tiêu đề + phụ đề trang · thẻ thống kê *Tổng hóa đơn* · CTA *Tạo hóa đơn* · bulk action *Duyệt hóa đơn* · ô tìm kiếm · card *Hóa đơn gần đây* · tiêu đề *Thông tin hóa đơn* · toast *Đã tạo hóa đơn mới* · toàn bộ nội dung panel Trợ lý AI của module.

**Cố ý giữ nguyên chữ "hợp đồng"** ở các ngữ cảnh khác (không thuộc module): ma trận phân quyền, nhóm nghiệp vụ trong Quy trình, tên tệp mẫu trong Knowledge Base, nhãn chuyển đổi từ Báo giá — vì đây là nghiệp vụ/ dữ liệu khác, không phải tên module.

- Lý do: đưa **Sản phẩm** lên trước **Báo giá** vì báo giá phải chọn sản phẩm; thứ tự còn lại theo luồng Khách hàng → Sản phẩm → Báo giá → Đơn → Hóa đơn → Loyalty.
- Việt hoá toàn bộ nhãn (bỏ "Loyalty" tiếng Anh).
- Chỉ đổi nhãn và thứ tự hiển thị; điều hướng và nội dung từng trang giữ nguyên.

---

## [2026-07-25] — ĐẶC TẢ LUỒNG XÁC THỰC (trạng thái hiện hành)

Tổng hợp toàn bộ nghiệp vụ Đăng ký · Đăng nhập · Quên mật khẩu · Khai báo bắt buộc sau các đợt sửa bên dưới.

### A. Đăng ký — 3 bước

```
[1] Chọn cách xác thực          [2] Nhập mã xác thực         [3] Xác nhận
    ○ Qua Zalo  (số Zalo)   →       6 ô OTP                →   Thẻ tài khoản đã xác thực
    ○ Qua Email (email cty)         nút "Xác nhận mã"          ← Quay lại
    nút: Nhận mã kích hoạt          tự chuyển khi đủ 6 số      nút "Đăng nhập vào App"
    qua Zalo / qua Email            link Đổi số / Đổi email            │
    hoặc: 6 nút social 1 chạm                                          ▼
                                                          popup Khai báo bắt buộc
```

- Nhãn bước: `CHỌN CÁCH XÁC THỰC · NHẬP MÃ XÁC THỰC · XÁC NHẬN`; thanh tiến trình 3 vạch.
- Toàn bộ câu chữ đổi theo kênh đã chọn (tiêu đề, đích nhận mã, nhãn "Đổi số"/"Đổi email", avatar).
- Social 1 chạm: Google · Facebook · LinkedIn · ChatGPT · Gemini · DeepSeek → vào thẳng popup khai báo.
- **Không còn** lối thoát "Vào app, hoàn tất sau" trong luồng đăng ký.

### B. Đăng nhập — Zalo là mặc định

```
Màn đăng nhập
 ├─ (mặc định) Zalo · OTP:  +84 ▸ số Zalo → "Nhận mã OTP qua Zalo"
 │                          → 6 ô OTP (← Đổi số) → "Xác nhận & vào Workspace"
 │                          → link "Đăng nhập bằng email"
 └─ Email & mật khẩu:       email + mật khẩu + Ghi nhớ 30 ngày
                            → "Đăng nhập vào Workspace"
                            → 6 nút social · link "← Đăng nhập qua Zalo" · "Quên mật khẩu?"
```

Nút "Nhận mã OTP" chỉ bật khi số Zalo ≥ 9 chữ số.

### C. Quên mật khẩu

```
Đăng nhập (pane Email) → "Quên mật khẩu?" → nhập email công ty
→ "Gửi link đặt lại" → màn xác nhận "Đã gửi email" (link hiệu lực 15 phút)
→ "Về đăng nhập"   |   mọi màn đều có ← Quay lại
```

Chỉ áp dụng cho đường Email; đường Zalo không cần mật khẩu nên không có bước này.

### D. Khai báo bắt buộc (popup Onboarding) — áp dụng cho MỌI đường vào

```
login()  ─ đọc cờ ac_declared ─┬─ đã khai báo → vào thẳng Workspace
                               └─ chưa       → onbPending = true
                                              ▼
                    [1] Thông tin doanh nghiệp / cá nhân
                        ○ Doanh nghiệp / Hộ KD → MST → [Tra cứu]
                          → Tên · Địa chỉ · Người đại diện · Điện thoại
                            · Ngày hoạt động · Tình trạng   (tự điền, sửa được)
                        ○ Cá nhân → VNeID → nhập tay
                          → Họ và tên · Địa chỉ · Điện thoại
                                              ▼
                    [2] Lĩnh vực kinh doanh (mô tả tự do)
                        → "Hoàn tất & vào Workspace" → ac_declared = '1'
```

- Popup **chặn toàn màn** (z-index 2000), không có nút đóng — bắt buộc hoàn tất.
- Nút bước 1 bật khi có tên; nút bước 2 bật khi đã nhập lĩnh vực kinh doanh.
- Tiêu đề và nhãn bước đổi theo loại tài khoản (Doanh nghiệp / Cá nhân).

### E. Cờ lưu trạng thái (localStorage)

| Cờ | Ý nghĩa |
|---|---|
| `ac_authed` | Đã đăng nhập |
| `ac_declared` | Đã hoàn tất khai báo (một lần, dùng cho mọi lần đăng nhập sau) |
| `ac_onbpending` | Đang nợ khai báo — bật popup khi vào app |

---

## [2026-07-25] — Bỏ card lớn bao bọc khối Templates

- Trang **AI Agents** và **Quy trình**: bỏ khung card gradient bao ngoài khối "…mẫu (Templates)". Tiêu đề + mô tả nằm trực tiếp trên trang, 20 card mẫu hiển thị thẳng ra ngoài (lưới 5 cột) — nhẹ và thoáng hơn.

---

## [2026-07-25] — Hộp thư: nút ＋ đính kèm & kết nối trong ô soạn tin

- Thêm nút **＋** đầu hàng công cụ của ô soạn tin (Hộp thư → hội thoại), mở popover kiểu Claude:
  - **Thêm tệp hoặc hình ảnh** (Ctrl+U) · **Chụp ảnh màn hình**
  - **Skills ▸** → Tóm tắt hội thoại · Soạn phản hồi · Dịch tin nhắn · Phân tích ý định · Chấm điểm lead · Trích xuất thông tin khách
  - **Connectors ▸** → Zalo ZBS · Google Sheets · Misa · KiotViet · Sapo · Haravan · WooCommerce · Odoo · Brevo · Fast
  - **Plugins ▸** → Bảng giá & Báo giá · Tra cứu đơn hàng · Kiểm tra tồn kho · Lịch hẹn · Thanh toán QR · Khảo sát CSAT
  - **Research** · **Web search**
- Ba mục có ▸ mở **menu con** bên phải (click lại để đóng); mục thường đóng popover và chạy hành động.
- Popover dùng `position:fixed` (`z-index` 2100/2101) ghim trên ô soạn tin, có cuộn — tránh bị vùng hội thoại cắt.
- Icon dựng bằng `iconEl` trong `renderVals()` (tránh `<use href="{{ }}">` gây lỗi console).

---

## [2026-07-25] — Mở rộng thư viện mẫu: 20 AI Agents + 20 Quy trình

- **AI Agents mẫu**: 10 → **20 mẫu** (5 cột × 4 hàng). Thêm: Tư vấn sản phẩm TMĐT · Bất động sản · Giáo dục & Tuyển sinh · Nhà hàng & Đặt bàn · Du lịch & Tour · Bảo hành & Kỹ thuật · Tuyển dụng & HR · Khảo sát & Phản hồi · Nhắc tái mua định kỳ · Kiểm duyệt & An toàn.
- **Quy trình mẫu**: 10 → **20 mẫu** (5 cột × 4 hàng). Thêm: Phân luồng theo intent · AI trực ngoài giờ · Chấm điểm lead tự động · Xác nhận đơn hàng · Chuỗi nuôi dưỡng Email · Sinh nhật & Dịp lễ · Phân công theo ca trực · Nhắc hợp đồng hết hạn · Cảnh báo khách rủi ro · Đồng bộ dữ liệu nền tảng.
- Ghi chú kỹ thuật: khôi phục lại bản sửa `iconEl` (dựng icon bằng `React.createElement` trong `renderVals()`) sau khi thao tác undo của người dùng làm quay lại `<use href="{{ … }}">` — nguyên nhân gây lỗi console.

---

## [2026-07-25] — Trang Quy trình: xoá danh sách workflow mẫu cứng

- **Xoá 6 workflow demo** khỏi danh sách: AI tự trả lời giờ nghỉ (22h–7h) · Phân luồng khách theo intent · Chào mừng khách mới · Nhắc giỏ hàng bỏ quên · Win-back khách 60 ngày · Khảo sát CSAT sau ticket.
- Lý do: theo hướng AI-Native, quy trình được dựng từ **Quy trình mẫu (Templates)** hoặc qua hội thoại với Trợ lý AI, không hiển thị dữ liệu demo cố định.

---

## [2026-07-25] — Trang AI Agents: gọn theo hướng AI-Native

- **Xoá** section **"Sơ đồ phối hợp Người × AI"** và **"Quy tắc phân luồng hội thoại"** — phân luồng nay do Trợ lý AI / Workflow đảm nhiệm, không cấu hình thủ công.
- **Xoá** lưới 6 card Agent nghiệp vụ (Marketing · Lead Qualification · Sales · Retention · Loyalty · Service).
- Trang còn lại: thống kê + khối **AI Agents mẫu (Templates)** 10 mẫu / 5 cột × 2 hàng, tạo agent qua hội thoại với Trợ lý AI.

---

## [2026-07-25] — Định hướng AI-Native: AI Agents qua Trợ lý AI + thư viện Templates

### Nguyên tắc thiết kế đã chốt
1. **AI Agents** — người dùng *không cấu hình thủ công*; agent được tạo qua **hội thoại với Trợ lý AI**, hoặc chọn từ **AI Agents mẫu (Templates)** rồi tùy biến.
2. **AI Templates** — thư viện mẫu dựng sẵn theo ngành nghề/nghiệp vụ, cài đặt ngay hoặc chỉnh qua hội thoại.
3. **AI-Driven Administration** — cấu hình vận hành (SLA · KPI · Phân ca · Thành viên · Vai trò & Phân quyền · Phòng ban · Sơ đồ tổ chức · Kênh kết nối · Nền tảng tích hợp · Custom Fields · Mẫu trả lời · Workflow) thực hiện bằng hội thoại, không qua màn hình cấu hình phức tạp.
4. **AI-Driven Business Actions** — nghiệp vụ trong Chat (báo giá · hợp đồng · đơn hàng · email · ticket · lịch hẹn · task · ghi chú · comment · chuyển tiếp · gán phụ trách · trường dữ liệu) đi qua Trợ lý AI thay vì nút chức năng riêng.
5. **AI-First Experience** — AI là giao diện chính; màn hình quản trị/biểu mẫu truyền thống là lớp dự phòng.

### Thay đổi đã thực hiện (đợt 1)
- Trang **AI Agents**: nút chính đổi thành **"Tạo bằng Trợ lý AI"** (xanh brand); nút cũ hạ cấp thành **"Tạo thủ công"** (giữ nguyên form, không mất chức năng).
- Thêm khối **"AI Agents mẫu (Templates)"** — **10 mẫu, lưới 5 cột × 2 hàng** (Sales bán lẻ · CSKH dịch vụ · Marketing · Booking Spa/Clinic · Lead Qualify · Đơn hàng & Vận đơn · Thu hồi công nợ · Giữ chân & Loyalty · Tổng đài & Gọi ra · Báo cáo & Phân tích). Click mẫu → mở Trợ lý AI với yêu cầu cài đặt mẫu đó.

### Thay đổi đã thực hiện (đợt 1b — trang Quy trình/Workflow)
- Áp dụng cùng mô hình AI-Native: nút chính **"Tạo bằng Trợ lý AI"**, nút cũ hạ cấp **"Tạo thủ công"**.
- Thêm khối **"Quy trình mẫu (Templates)"** — **10 mẫu, lưới 5 cột × 2 hàng**: Chào khách mới · Nhắc follow-up · Giỏ hàng bỏ quên · Leo thang SLA · Nhắc lịch hẹn · Khảo sát CSAT · Duyệt báo giá · Nhắc công nợ · Tái kích hoạt khách nguội · Báo cáo định kỳ. Click mẫu → mở Trợ lý AI để dựng workflow qua hội thoại.
- Ghi chú kỹ thuật: **không dùng class `.btnp` cho card** (class ép `height:36px !important` gây tràn nội dung) — dùng `style-hover` thay thế.

### Việc còn mở (backlog AI-Native)
- Đợt 2: chip hội thoại cho **AI-Driven Administration** (SLA/KPI/Phân ca/Phân quyền…) ngay trong Trợ lý AI.
- Đợt 3: thay các nút nghiệp vụ rời trong Chat bằng lệnh qua Trợ lý AI (giữ nút làm fallback).

---

## [2026-07-25] — Chuẩn hoá ngữ nghĩa & thống nhất quy tắc khai báo bắt buộc

**Sửa câu chữ theo kênh xác thực (Zalo / Email):**
- Bước 3 tiêu đề cứng *"Đã xác thực số điện thoại"* → đổi động: **"Đã xác thực email"** hoặc **"Đã xác thực số Zalo"** (`regS3Title`).
- Thẻ tài khoản bước 3 cứng `+84 … · qua Zalo` → hiển thị đúng **email · qua Email** / **+84 … · qua Zalo** (`regS3Sub`), avatar đổi màu theo kênh (`regS3Avatar`).
- Bước 2 link *"Đổi số"* → **"Đổi email"** khi đăng ký bằng email (`regChangeLabel`).
- 6 nút social ở màn **Đăng ký** trước đây là nút chết (không có `onClick`) → nay đăng ký 1 chạm rồi mở popup khai báo.

**Thống nhất quy tắc "chưa khai báo thì không vào được app":**
- Trước: chỉ đường **Zalo OTP** kiểm tra cờ `ac_declared`; đăng nhập bằng **Email & mật khẩu** và **6 nút social** vào thẳng app — sai quy tắc đã chốt.
- Nay: chuyển toàn bộ logic vào `login()` — đọc `ac_declared`, nếu chưa khai báo thì bật `onbPending` + `ac_onbpending`.
- `zaloLogin()` gọi lại `login()` để tránh trùng logic hai nơi.
- Kết quả: **mọi đường đăng nhập** đều bị chặn bởi popup khai báo nếu chưa hoàn tất; hoàn tất một lần (`ac_declared='1'`) thì các lần sau vào thẳng.

---

## [2026-07-25] — Rút gọn đăng ký còn 3 bước, dời khai báo vào popup

**Luồng mới:**
1. **Chọn cách xác thực** — Zalo hoặc Email.
2. **Nhập mã xác thực** (đổi tên từ "Xác thực OTP") — 6 số, có nút *Xác nhận mã*, tự chuyển bước khi đủ số.
3. **Xác nhận** — hiển thị tài khoản đã xác thực, có nút **← Quay lại** và **Đăng nhập vào App**.

**Sau khi vào app**: mở ngay **popup khai báo bắt buộc 2 bước** (trước là bước 4/5 và 5/5 của đăng ký):
- Bước 1 — Thông tin doanh nghiệp / cá nhân (MST + Tra cứu, hoặc VNeID + nhập tay).
- Bước 2 — Lĩnh vực kinh doanh → **Hoàn tất & vào Workspace**.

**Thay đổi kỹ thuật:**
- Thanh tiến trình từ 5 → **3 vạch**; nhãn bước: `CHỌN CÁCH XÁC THỰC · NHẬP MÃ XÁC THỰC · XÁC NHẬN`.
- Thêm `regBack2` (nút Quay lại ở bước 3) và `regFinish` (vào app + bật `onbPending`).
- Gỡ hai khối `regS4`/`regS5` khỏi màn đăng ký — nội dung chỉ còn tồn tại một nơi là popup onboarding.
- Nhánh **Cá nhân**: input nền `#F9FAFB` + placeholder gợi ý, không có nút Tra cứu.

---

## [2026-07-25] — Tách nhóm loại tài khoản: Doanh nghiệp/Hộ KD vs Cá nhân

- Gộp **Hộ kinh doanh** vào cùng nhóm với **Doanh nghiệp** (đều dùng **Mã số thuế**).
- **Cá nhân** thành nhóm riêng, xác thực bằng **Mã VNeID**.
- Tiêu đề bước 4 đổi động: *Thông tin doanh nghiệp* (DN/Hộ KD) hoặc *Thông tin cá nhân*.
- Trường hiển thị theo nhóm:
  - **DN / Hộ KD**: MST → Tên công ty/hộ KD · Địa chỉ · Người đại diện · Điện thoại · Ngày hoạt động · Tình trạng.
  - **Cá nhân**: Mã VNeID → Họ và tên · Địa chỉ · Điện thoại (bỏ Người đại diện, Ngày hoạt động, Tình trạng).
- **Lĩnh vực kinh doanh** vẫn ở bước 5, áp dụng cho cả hai nhóm.

---

## [2026-07-25] — Sửa lặp màn hình trong luồng đăng ký

- Phát hiện **3 khối bị nhân đôi** trong template đăng ký: bước 2 (Nhập mã xác thực), bước 3 (Đã xác thực) và bước 4 (Thông tin doanh nghiệp) — gây hiển thị OTP và thông tin xác thực **2 lần**.
- Đã xoá các khối trùng; mỗi bước 1/5 → 5/5 giờ chỉ render **một lần**.
- Bước 2 hiển thị đúng **một** đích nhận mã theo lựa chọn ở bước 1 (`regOtpTarget`): Zalo +84… hoặc email đã nhập.

---

## [2026-07-25] — Làm lại luồng đăng ký bước 4/5 & popup Onboarding

**Bước 4 — Thông tin doanh nghiệp** (đăng ký + popup onboarding, giống hệt nhau):
- Chọn loại: **Doanh nghiệp** hoặc **Cá nhân / Hộ KD**.
- Nhập **Mã số thuế** (DN) hoặc **Mã định danh cá nhân/VNeID** (cá nhân) → nhấn **Tra cứu**.
- Hệ thống trả về và tự điền: **Tên công ty / Tên hộ KD · Địa chỉ · Người đại diện · Điện thoại · Ngày hoạt động · Tình trạng** (đều sửa được).
- **Xoá bỏ** hoàn toàn phần chọn *Nhóm ngành* và *Ngành cụ thể* (chip + "Ngành khác" + gợi ý Loyalty).

**Bước 5 — Lĩnh vực kinh doanh**:
- Thay màn "Định danh pháp lý" bằng câu hỏi **"Lĩnh vực kinh doanh của bạn?"** — ô mô tả tự do.
- Dùng để AppChat gợi ý AI Agent, quy trình và mẫu trả lời phù hợp.
- Nhãn bước đổi: `ĐỊNH DANH PHÁP LÝ` → `LĨNH VỰC KINH DOANH`.

**"Vào app, hoàn tất sau"**: vẫn bắt buộc khai báo qua **popup onboarding 2 bước** với đúng nội dung như bước 4 và 5, hoàn tất mới vào hệ thống.

---

## [2026-07-25] — Lọc phân cấp cho Quy trình mẫu (menu Quy trình)

- Áp dụng cùng mô hình như AI Agents: **Tìm kiếm → Nhóm nghiệp vụ → Nghiệp vụ cụ thể → Quy trình**.
- **Nhóm nghiệp vụ** (5): Bán hàng & Doanh thu · Chăm sóc & Hỗ trợ · Tiếp thị & Giữ chân · Tài chính & Kế toán · Vận hành & Định tuyến.
- Select cấp dưới lọc động theo cấp trên; chọn lại cấp trên reset cấp dưới; có nút **Xoá lọc**.
- Mọi control cao **36px** theo chuẩn app.

---

## [2026-07-25] — Lọc phân cấp theo ngành trên trang AI Agents

- Thay dải chip lọc bằng **luồng lọc phân cấp 4 bước**: **Tìm kiếm → Nhóm ngành → Ngành cụ thể → AI Agent**.
- **Nhóm ngành** (8): Bán lẻ & TMĐT · Dịch vụ & CSKH · Tiếp thị & Tăng trưởng · Bất động sản · Giáo dục · F&B & Du lịch · Tài chính & Kế toán · Vận hành nội bộ.
- **Ngành cụ thể** lọc động theo nhóm đã chọn; **AI Agent** lọc động theo cả nhóm + ngành.
- Chọn lại cấp trên sẽ **reset các cấp dưới**; có nút **Xoá lọc**.
- Mọi control cao **36px** theo chuẩn app.

---

## [2026-07-25] — Bộ tìm kiếm & bộ lọc cho AI Agents mẫu

- Thêm **ô tìm kiếm** trên trang **AI Agents** (khớp theo tên mẫu, mô tả và ngành/nhóm).
- Thêm **dải chip lọc** theo ngành/nhóm agent: Tất cả · Bán hàng · CSKH · Marketing · Lịch hẹn · Lead · Đơn hàng · Kế toán · Loyalty · Gọi điện · Báo cáo · TMĐT · BĐS · Giáo dục · F&B · Du lịch · Kỹ thuật · Nhân sự · Giữ chân · Vận hành.
- Tìm kiếm và chip lọc **kết hợp** với nhau (AND), lưới 20 mẫu lọc trực tiếp.
- Không thay đổi dữ liệu mẫu hay hành vi "cài đặt mẫu → chuyển sang Trợ lý AI".

---

## [2026-07-25] — Gộp Coworks vào Trợ lý AI (thực thi backlog)

- **Trước:** Coworks là một trang riêng trong Settings → nhóm AI.
- **Sau:** trở thành **tab "Tác vụ tự chủ"** ngay trong module **Trợ lý AI** (cạnh Trò chuyện · Phiên trò chuyện · Nhật ký hành động), có trong submenu hover của sidebar.
- Gỡ mục `Tác vụ tự chủ (Coworks)` khỏi Settings → AI.
- Lý do: cả hai đều là "AI phục vụ nhân viên"; gộp để tránh chồng lấn với AI Agents (phục vụ khách hàng).
- Giữ nguyên 100% chức năng: thống kê, danh sách agent, drawer cấu hình (Prompt · Kiến thức · Công cụ · Nhật ký).

---

## [2026-07-25] — Phân tầng lại 4 module AI (AI Agents · Quy trình · Web Widget · Coworks)

### Bối cảnh
Bốn module bị đánh giá là chồng lấn chức năng vì cùng gắn nhãn "AI". Sau khi rà soát, xác định ranh giới theo trục **chủ thể / nơi làm việc / cơ chế**:

| Module | Bản chất | Phục vụ | Cơ chế |
|---|---|---|---|
| **AI Agents** | "Nhân sự AI" — chủ thể thực thi | Khách hàng | Suy luận theo ngữ cảnh, RAG, 24/7, có SLA |
| **Quy trình (Workflow)** | "SOP" — luật chạy nền | Hệ thống | Trigger → điều kiện → hành động, xác định trước |
| **Web Widget Studio** | Điểm chạm (kênh) trên website | Khách hàng | Không phải AI; chỉ *chọn* Agent nào trực |
| **Coworks** | Trợ lý tự chủ nội bộ | Nhân viên | Nhiệm vụ nhiều bước, thao tác file, sandbox + xác nhận |

### Mô hình phân tầng đã chốt
```
Kênh (Widget, Zalo, FB…)   ← điểm chạm
      ↓
AI Agents                   ← ai xử lý
      ↓
Quy trình (Workflow)        ← chạy theo luật
      ↓
Coworks / Trợ lý AI         ← nội bộ, tự chủ, nhiều bước
```

### Thay đổi đã thực hiện
1. **Đổi tên menu Settings**: `Claude Coworks` → **`Tác vụ tự chủ (Coworks)`**
   - Lý do: làm rõ đây là AI *nội bộ phục vụ nhân viên*, không nhầm với AI Agents phục vụ khách hàng.
   - Vị trí: Settings → nhóm **AI**.
2. **Web Widget Studio chỉ *chọn* AI Agent**, không cấu hình prompt/kiến thức tại chỗ
   - Dropdown chọn Agent + nút `＋` điều hướng sang trang **AI Agents** để tạo/sửa.
   - Lý do: widget là điểm chạm, không phải nơi tạo agent.
3. **Quan hệ Workflow ↔ AI Agent**: Workflow gọi AI Agent như một node trong luồng (Agent = "người", Workflow = "SOP").

### Ảnh hưởng
- Người dùng phân biệt rõ: cấu hình *ai xử lý* → AI Agents; cấu hình *chạy theo luật* → Quy trình; cấu hình *khách gặp ở đâu* → Kênh/Widget; *nhờ AI làm việc nội bộ* → Coworks / Trợ lý AI.
- Không mất chức năng nào; chỉ đổi nhãn và siết ranh giới điều hướng.

### Việc còn mở (backlog)
- Cân nhắc gộp hẳn **Coworks** thành một tab "Tác vụ tự chủ" bên trong **Trợ lý AI** (thay vì menu Settings riêng), nếu chồng lấn vẫn còn.
- Bổ sung node **"Gọi AI Agent"** hiển thị tường minh trong trình dựng Workflow.

---

## [trước 2026-07-25] — Lịch sử tóm tắt

- Chuẩn hoá định vị: **"AppChat — Nền tảng AI Agents vận hành Doanh nghiệp Một Người"** trên toàn bộ app, deck, tài liệu kiến trúc và marketing.
- Tách **Kênh kết nối** và **Nền tảng kết nối** thành 2 menu riêng trong nhóm Ứng dụng (Settings).
- Tách card Email/SMS Marketing thành từng nhà cung cấp (Brevo · Google Workspace · Gmail · Mailgun · Viettel · VNPT · eSMS · Twilio); click card khoá đúng cấu hình nhà cung cấp đó.
- **Cloud Storage** cố định là AppChat Cloud (bỏ S3/Drive/Dropbox).
- Luồng đăng ký: xác nhận qua **Zalo hoặc Email**; "Vào app, hoàn tất sau" → popup **Onboarding bắt buộc** 2 bước (Thông tin DN → MST/VNeID).
- Social login: Google · Facebook · LinkedIn · ChatGPT · Gemini · DeepSeek (bỏ Zalo), logo thật, lưới 3 nút/hàng, đặt dưới dòng chuyển màn.
- Bộ wireframe tài liệu: Auth · Dashboard · Trợ lý AI · Hộp thư · Khách hàng & CRM — kèm mô tả nghiệp vụ và toàn bộ luồng làm việc.
