# Launcher parser tệp đầu vào Trợ lý (TIP-023f §2.1, DC-425)

Worker `ROLE=ai` parse tệp người dùng đính kèm Trợ lý (PDF / DOCX / XLSX / CSV / HTML / .eml / ảnh). Việc parse chạy trong **tiến trình con**
`node --permission --allow-fs-read=<thư mục bundle> dist/parser.cjs`. Tiến trình này:

- chỉ có env tối thiểu;
- bị chặn mạng ở tầng module;
- có stdin / stdout giới hạn byte;
- chạy tối đa 30s;
- bị cha đo RSS, vượt 128 MiB thì cha giết cả cây.

Thư mục này thêm **trần OS cứng**. Bật bằng cách đặt `PARSER_LAUNCHER` cho worker `ROLE=ai`.

| Nền tảng | Launcher | Trần |
|---|---|---|
| Linux (VPS) | `linux/run.sh` | `systemd-run` service tạm: `MemoryMax=128M`, `MemorySwapMax=0`, `TasksMax=8`, `PrivateNetwork=yes` (không mạng), `ProtectSystem=strict`, `ProtectHome`, `DynamicUser`, `NoNewPrivileges`, `RestrictAddressFamilies=AF_UNIX` |
| Windows | `windows/run.ps1` (+ `build.ps1` provision một lần) | AppContainer không capability (không mạng; chỉ đọc + thực thi bundle + Node theo ACL) + Job Object 128 MiB / ≤ 8 tiến trình / đóng handle = giết cây |

Thiếu launcher hoặc chưa provision → launcher thoát 70 → artifact `failed` lý do `parser_isolation_unavailable`. Worker **không bao giờ** parse
trong tiến trình chính. Thiếu `dist/parser.cjs` cũng ra cùng lý do.

## Provision

- **Linux:** đặt worker ngoài `/home` (vd. `/opt/appchat`, do `ProtectHome=yes`). User chạy worker cần quyền `systemd-run` (root hoặc
  polkit rule cho đơn vị `run-*`). Đặt `PARSER_LAUNCHER=/opt/appchat/infra/parser/linux/run.sh`.
- **Windows:**
  - Kế hoạch (mặc định): `powershell -ExecutionPolicy Bypass -File infra\parser\windows\build.ps1 -Bundle <worker>\dist -Node "C:\Program Files\nodejs"`.
  - Thực hiện: thêm `-Apply`.
  - Sau đó đặt `PARSER_LAUNCHER=<repo>\infra\parser\windows\run.ps1`.

## Kiểm âm (bắt buộc trước khi bật trên máy thật)

Chạy trên đúng máy đích, với `PARSER_LAUNCHER` đã đặt:

1. **Mạng:** parser thử mở socket tới `1.1.1.1:443` (module `net`, và cả addon native nếu có) → phải lỗi / không kết nối.
2. **Bộ nhớ:** cấp phát > 128 MiB → tiến trình bị giết, artifact `failed` (`timeout` hoặc `corrupt`). Không được `ready` một phần.
3. **Hệ thống tệp:**
   - đọc `.env` / thư mục home → bị từ chối;
   - ghi bất kỳ đâu ngoài `/tmp` riêng → bị từ chối.
4. **Cây tiến trình:** parser sinh tiến trình con rồi treo → sau 30s không còn tiến trình nào của job.
5. **Smoke:** `pnpm --filter @appchat/worker test -- test/integration/parser-sandbox.test.ts` với `PARSER_LAUNCHER` đặt.

**Trạng thái:** viết trước khi có VPS (DC-304). Chưa nghiệm thu trên máy thật. Trên máy dev Windows hiện chạy tầng `node --permission`
(đã kiểm âm ở `parser-sandbox.test.ts`).
