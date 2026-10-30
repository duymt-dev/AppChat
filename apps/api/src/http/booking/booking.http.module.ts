// Controller HTTP của domain `booking` nằm trong thư mục này. Stub TIP-001; TIP 033 thêm controller.
import { Module } from '@nestjs/common';
import { BookingModule } from '@appchat/core';

@Module({ imports: [BookingModule] })
export class BookingHttpModule {}
