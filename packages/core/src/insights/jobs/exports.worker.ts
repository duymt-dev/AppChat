// Kind việc dữ liệu xuất 4 danh sách (TIP-038 pha 3) — đăng ký khi InsightsJobsModule nạp ở ROLE=jobs. Runner kernel (DataJobsModule)
// giành lease, kiểm người tạo còn quyền xem danh sách, rồi gọi `whole` của kind: dựng XLSX từ tập id chốt dưới quyền hiện tại, ghi Storage.
// Thiếu Storage → không đăng ký (việc dừng ở `unknown_kind` → failed, không báo thành công).
import { Inject, Optional } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { STORAGE, type Storage } from '../../kernel/files/storage';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { registerListExportKinds } from '../exports/export-runner';

export class ListExportKinds {
  constructor(
    @Optional() @Inject(STORAGE) storage: Storage | undefined,
    @Optional() @Inject(PLATFORM_DB) platform: PlatformDb | undefined,
  ) {
    if (storage) registerListExportKinds(storage, platform ?? null);
  }
}
