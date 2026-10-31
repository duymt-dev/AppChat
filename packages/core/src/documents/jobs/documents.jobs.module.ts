// Worker ROLE=jobs của domain `documents`. TIP-028 render PDF xem trước mẫu ngay trong API (DocRenderer — tối đa 2 lượt LibreOffice
// cùng lúc, 60 giây — DV-007); queue `doc-render` cho chứng từ phát hành (PDF đóng băng + sha256) thêm ở TIP-029 / 030 khi có chứng từ.
import { Module } from '@nestjs/common';

@Module({})
export class DocumentsJobsModule {}
