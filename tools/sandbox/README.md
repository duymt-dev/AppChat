# Render cô lập — DOCX tải lên → PDF (TIP-030b spec 6, DC-321)

Tệp DOCX hợp đồng do người dùng / khách gửi là **đầu vào không tin cậy**. API không gọi LibreOffice trực tiếp cho loại tệp này. Mọi lần đổi
đi qua launcher cô lập trong biến môi trường `RENDER_ISOLATION_LAUNCHER`. Không cấu hình hoặc launcher không tồn tại thì đóng an toàn:
lỗi 501 `render_isolation_unavailable`, không tạo PDF để ký, không ngầm chạy không cô lập.

Mẫu chứng từ của chính doanh nghiệp (TIP-028, đã qua kiểm khi lưu mẫu) vẫn render bằng `SofficeConverter` như cũ.

## Giao kèo launcher

`<launcher> <soffice> <thư-mục-tạm> <giây>`

- **Đầu vào:** `<thư-mục-tạm>/in.docx`. Thư mục do API tạo, tiền tố `appchat-isolated-`, nằm trong thư mục tạm hệ thống; launcher từ chối mọi đường khác.
- **Đầu ra:** `<thư-mục-tạm>/out/in.pdf`.
- **Mã thoát:** `0` thành công · `124` hết giờ · khác `0` là lỗi.
- API giết cả cây tiến trình khi quá giờ + 5 giây. API chỉ xoá đúng thư mục tạm của mình.
- Tối đa 2 lần đổi cùng lúc (`ISOLATED_CONCURRENCY`).

## Linux (VPS) — `render-linux.sh`

Điều kiện chuẩn bị (provision, chạy một lần bằng quyền quản trị — không phải việc của ứng dụng):

1. User hệ thống không đăng nhập: `useradd --system --no-create-home --shell /usr/sbin/nologin appchat-render`.
2. User chạy API được phép gọi `systemd-run` có `--uid` cho user này. Cấp bằng polkit rule giới hạn đúng lệnh này, hoặc sudoers một dòng trỏ tới đường dẫn tuyệt đối của launcher.
3. `RENDER_ISOLATION_LAUNCHER=/opt/appchat/tools/sandbox/render-linux.sh` trong env của API + worker.

Unit tạm có các thuộc tính sau:

| Nhóm | Thuộc tính |
|---|---|
| Mạng | `PrivateNetwork=yes`, `RestrictAddressFamilies=AF_UNIX` |
| Quyền | `NoNewPrivileges=yes`, `CapabilityBoundingSet=` rỗng |
| Hệ thống tệp | `ProtectSystem=strict`, `ProtectHome=yes`, `PrivateTmp=yes`, `ReadWritePaths` chỉ thư mục tạm |
| Tài nguyên | `MemoryMax=1G`, `TasksMax=64`, `RuntimeMaxSec=<giây>` |

## Windows (dev / test) — `render-windows.ps1`

`RENDER_ISOLATION_LAUNCHER=D:\…\tools\sandbox\render-windows.ps1`

Mặc định soffice chạy dưới token **AppContainer `appchat-render` không capability**:
- không có `internetClient` / `privateNetwork`, nên không có mạng;
- chỉ thư mục tạm của lần đổi được cấp ACL cho SID AppContainer, mọi nơi khác từ chối;
- profile AppContainer tạo theo user hiện tại, không cần quản trị.

Bọc ngoài là **Job Object**:
- bộ nhớ 1GB;
- tối đa 32 tiến trình;
- `KILL_ON_JOB_CLOSE`: đóng job là giết cả cây;
- tiến trình tạo ẩn (`CREATE_NO_WINDOW`) và treo cho tới khi gán vào job;
- không kế thừa biến proxy; `TEMP` / `TMP` / `USERPROFILE` trỏ vào thư mục tạm.

**Giới hạn đã biết (DV-024, Q-047):** LibreOffice 26.8 treo ngay ở khởi tạo trong AppContainer không capability. Máy dev / test đặt
`RENDER_ISOLATION_WINDOWS_MODE=job-dev`: chỉ Job Object, **không cô lập mạng**. API từ chối chế độ này khi `NODE_ENV=production`.
Môi trường phát hành là Linux (Blueprint §11).

## Bằng chứng

`packages/core/test/render-isolation.test.ts`:
- chưa cấu hình → 501, `job-dev` ở production → không launcher;
- launcher giả: thành công, mã 124 → 504, treo quá giờ → giết cả cây (kiểm PID đã chết);
- thư mục tạm bị dọn;
- không quá 2 lần đổi cùng lúc;
- Windows thật: AppContainer chặn mạng (`curl` → 000) và chặn ghi ngoài thư mục tạm;
- Windows thật: DOCX → PDF qua `render-windows.ps1` (`job-dev`) bằng LibreOffice cài trên máy.

Linux thật: chưa nghiệm thu (chưa có VPS — Q-006). Chạy cùng test trên VPS sau provision.
