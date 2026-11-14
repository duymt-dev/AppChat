// Cơ hội / Sales Pipeline (TIP-026c, D60): handler action ghi + luồng giai đoạn. Handler đọc (list / get) cần CrmMembers → CrmModule đăng ký
// qua OPPORTUNITY_READ_HANDLERS (như contact_activity.list). Luật chuyển theo chứng từ không phải handler — producer gọi qua crm/public.
import { Module } from '@nestjs/common';
import { OpportunityArchiveHandler, OpportunityCreateHandler, OpportunityUpdateHandler } from './write.handlers';
import { OpportunityMarkLostHandler, OpportunityReopenHandler, OpportunitySetOwnerHandler, OpportunitySetStageHandler } from './flow.handlers';
import { OpportunityGetHandler, OpportunityListHandler } from './read.handlers';

/** Handler cần CrmMembers (tên người / kiểm thành viên) — đăng ký ở CrmModule nơi có provider đó. */
export const OPPORTUNITY_HANDLERS = [
  OpportunityCreateHandler,
  OpportunityUpdateHandler,
  OpportunityArchiveHandler,
  OpportunitySetStageHandler,
  OpportunityMarkLostHandler,
  OpportunityReopenHandler,
  OpportunitySetOwnerHandler,
  OpportunityListHandler,
  OpportunityGetHandler,
];

@Module({})
export class OpportunitiesModule {}
