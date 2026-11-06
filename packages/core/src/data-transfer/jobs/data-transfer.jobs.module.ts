// Worker ROLE=jobs của data-transfer (TIP-038b, DC-374): kind `transfer.commit` của khung việc dữ liệu 045b (consumer `data_job.requested`
// + quét lease hết hạn — DataJobsModule). Runner `whole`: khung đã kiểm người tạo còn quyền action gốc + lease; ghi từng lô qua
// ActionExecutor (quyền hiện tại đọc lại mỗi lô), huỷ hợp tác qua `shouldStop`. Kết thúc: kế hoạch ghi số đếm thật, data_job báo người tạo.
import { Inject, Module, Optional } from '@nestjs/common';
import { registerDataJobKind } from '../../kernel/jobs/bulk-dispatch';
import { DataJobsModule } from '../../kernel/jobs/data-jobs/data-jobs.module';
import { DataTransferModule } from '../data-transfer.module';
import { TransferDeps } from '../data-transfer.providers';
import { TRANSFER_COMMIT_KIND } from '../types';
import { commitPlan } from './transfer.runner';

export function registerTransferCommitKind(d: TransferDeps) {
  registerDataJobKind(TRANSFER_COMMIT_KIND, {
    label: 'Nhập dữ liệu',
    whole: async (c, _l, shouldStop) => {
      const planId = (c.job.input as { plan_id: string }).plan_id;
      const r = await commitPlan(
        c.db,
        c.ws,
        planId,
        { executor: d.executor(), authzOf: (w, u) => d.authzOf(w, u), now: c.now },
        shouldStop,
      );
      return { status: r.status === 'cancelled' ? 'cancelled' : 'completed' };
    },
  });
}

class TransferJobKinds {
  constructor(@Optional() @Inject(TransferDeps) d: TransferDeps | undefined) {
    if (d) registerTransferCommitKind(d);
  }
}

@Module({ imports: [DataTransferModule, DataJobsModule], providers: [TransferJobKinds] })
export class DataTransferJobsModule {}
