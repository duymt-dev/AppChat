// BullMQ processor của domain `booking` (chạy trong worker). Stub TIP-001; TIP 033 thêm processor.
import { Module } from '@nestjs/common';
import { BookingModule } from '../booking.module';

@Module({ imports: [BookingModule] })
export class BookingJobsModule {}
