// Controller HTTP của domain `documents` nằm trong thư mục này. Stub TIP-001; TIP 028 thêm controller.
import { Module } from '@nestjs/common';
import { DocumentsModule } from '@appchat/core';

@Module({ imports: [DocumentsModule] })
export class DocumentsHttpModule {}
