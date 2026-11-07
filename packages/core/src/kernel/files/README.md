# Tệp & Storage (kernel/files)

Port `Storage` (`storage.ts`) có hai bản, chọn bằng env (`storage-config.ts`, Blueprint §11 — chỉ đổi env):

| `STORAGE_DRIVER` | Bản | Ghi chú |
|------------------|-----|---------|
| `local` (mặc định) | `LocalStorage` | `FILES_DIR` (dev `./.data/files`, prod `/srv/appchat/files` + backup restic). Khoá không ra ngoài thư mục gốc. |
| `s3` | `S3Storage` (`@aws-sdk/client-s3`, DV-019) | S3-compatible (AWS, R2, MinIO, Ceph). Thiếu biến bắt buộc → dừng boot, không rơi về local. |

## Biến môi trường s3

| Biến | Bắt buộc | Ý nghĩa |
|------|----------|---------|
| `S3_BUCKET` | có | Bucket riêng tư (chặn public access ở phía nhà cung cấp). |
| `S3_REGION` | có | `auto` cho R2; region thật cho AWS. |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | có | Khoá riêng cho AppChat — chỉ đặt trong env tiến trình (`/etc/appchat/*.env`, quyền 600), không log, không commit. |
| `S3_ENDPOINT` | không | Chỉ `https://`; `http://` chỉ cho loopback (MinIO dev). |
| `S3_FORCE_PATH_STYLE` | không | `true` cho MinIO / Ceph. |
| `S3_PREFIX` | không | Tiền tố trong bucket (vd `appchat/prod`). |

## Quyền tối thiểu của khoá

Khoá chỉ cần ba quyền trên đúng tiền tố, không `ListBucket`, không `PutObjectAcl`, không presign:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
    "Resource": "arn:aws:s3:::<bucket>/<prefix>/*"
  }]
}
```

Object ghi với `ACL: private`; tải xuống luôn đi qua API (`/v1/files/:id/raw` có ký HMAC, kiểm quyền) — không bao giờ trả URL bucket cho client.

## Cổng tải lên

`FilesService.upload` gọi `guardUpload` (`upload-guard.ts`): loại theo nội dung (`magic.ts`), danh sách theo purpose, khớp đuôi + mime,
giới hạn theo loại, gói OOXML kiểm hình dạng ZIP / macro (`zip-guard.ts`) trước khi giải nén. Lỗi: 413 / 415 / 422 với `fields.file`.

## Nghiệm thu

- Native (local): `packages/core/test/upload-guard.test.ts`, integration `contract-files.test.ts`, `hardening-security.test.ts`.
- S3: `packages/core/test/s3-storage.test.ts` chạy SDK thật với máy chủ S3 giả trên loopback. **Chưa nghiệm thu với provider thật**
  (chưa có bucket / VPS — Q-006).
