// Chọn Storage theo env (Blueprint §11 — local mặc định, s3 chỉ đổi env; TIP-045b): `STORAGE_DRIVER=local|s3`. s3 thiếu bucket / khoá /
// region → dừng boot (không âm thầm rơi về local khi prod khai s3). Endpoint chỉ https (trừ loopback cho MinIO dev); khoá bí mật chỉ đọc
// từ env tiến trình, không log. Quyền tối thiểu cho khoá: s3:PutObject / GetObject / DeleteObject trên `<bucket>/<prefix>/*` (README).
import { z } from 'zod';
import { S3Storage } from './s3-storage';
import { LocalStorage, defaultFilesDir, type Storage } from './storage';

const LOOPBACK = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\/?$/;

export const storageEnv = z
  .object({
    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    FILES_DIR: z.string().min(1).optional(),
    S3_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/).optional(),
    S3_REGION: z.string().min(1).max(64).optional(),
    S3_ENDPOINT: z
      .string()
      .url()
      .refine((u) => u.startsWith('https://') || LOOPBACK.test(u), 'S3_ENDPOINT phải https (trừ loopback)')
      .optional(),
    S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    S3_FORCE_PATH_STYLE: z.enum(['true', 'false']).optional(),
    S3_PREFIX: z.string().regex(/^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*$/).optional(),
  })
  .superRefine((e, ctx) => {
    if (e.STORAGE_DRIVER !== 's3') return;
    for (const k of ['S3_BUCKET', 'S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const)
      if (!e[k]) ctx.addIssue({ code: 'custom', path: [k], message: `${k} bắt buộc khi STORAGE_DRIVER=s3` });
  });

/** Dựng Storage từ env; lỗi cấu hình ném rõ tên biến (không kèm giá trị). */
export function storageFromEnv(source: Record<string, string | undefined>): Storage {
  const r = storageEnv.safeParse(source);
  if (!r.success) throw new Error(`Cấu hình storage không hợp lệ: ${r.error.issues.map((i) => i.path.join('.')).join(', ')}`);
  const e = r.data;
  if (e.STORAGE_DRIVER === 'local') return new LocalStorage(e.FILES_DIR ?? defaultFilesDir());
  return new S3Storage({
    bucket: e.S3_BUCKET!,
    region: e.S3_REGION!,
    endpoint: e.S3_ENDPOINT,
    accessKeyId: e.S3_ACCESS_KEY_ID!,
    secretAccessKey: e.S3_SECRET_ACCESS_KEY!,
    forcePathStyle: e.S3_FORCE_PATH_STYLE === 'true',
    prefix: e.S3_PREFIX,
  });
}
