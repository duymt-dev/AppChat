// PackagesReadModule (TIP-033b §1.4): sở hữu handler `package.list_for_contact`; reader là hàm thuần (read.service.ts) nhận tx — Booking /
// HTTP / tệp xuất import hàm, không import SalesModule / BookingModule (không vòng Sales → Booking → Sales). Chỉ phụ thuộc tenant / authz / crm.
import { Module } from '@nestjs/common';
import { PackageListForContactHandler } from './read.handler';

@Module({ providers: [PackageListForContactHandler] })
export class PackagesReadModule {}
