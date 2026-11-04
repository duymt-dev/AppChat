// Phụ lục hợp đồng (TIP-030b F3): handler 10 action `contract.create_appendix` / `contract.appendix_*` + đọc tab Phụ lục + trang ký công khai
// phụ lục (bộ chuyển token → ActionExecutor với capability niêm phong). ContractsModule gắn các provider này nên API, worker ROLE=ai
// (domain handlers) và ROLE=jobs cùng thấy handler. Thiếu DB / khoá / executor → service null (controller 501).
import { CLOCK, type Clock } from '../../kernel/clock';
import { ActionExecutor } from '../../kernel/actions/executor';
import { ContractDeps } from '../services/contract-deps';
import { ContractAppendixApproveAndSignHandler, ContractAppendixOwnerOtpHandler } from './approval.handlers';
import { AppendixPublicDeclineHandler, AppendixPublicOtpHandler, AppendixPublicSignHandler } from './public.handlers';
import { AppendixPublicService } from './public.service';
import { AppendixReadService } from './read.service';
import { ContractAppendixSendHandler } from './send.handlers';
import { ContractAppendixRequestChangesHandler, ContractAppendixSubmitHandler, ContractAppendixUpdateHandler, ContractCreateAppendixHandler } from './write.handlers';

export const APPENDIX_HANDLERS = [
  ContractCreateAppendixHandler, ContractAppendixUpdateHandler, ContractAppendixSubmitHandler, ContractAppendixRequestChangesHandler,
  ContractAppendixOwnerOtpHandler, ContractAppendixApproveAndSignHandler, ContractAppendixSendHandler,
  AppendixPublicOtpHandler, AppendixPublicSignHandler, AppendixPublicDeclineHandler,
];

/** Provider đọc + công khai — cần ContractDeps của ContractsModule. */
export const APPENDIX_SERVICES = [
  { provide: AppendixReadService, inject: [ContractDeps], useFactory: (d: ContractDeps) => (d.tenants ? new AppendixReadService(d) : null) },
  {
    provide: AppendixPublicService,
    inject: [ContractDeps, { token: ActionExecutor, optional: true }, CLOCK],
    useFactory: (d: ContractDeps, x: ActionExecutor | undefined, c: Clock) => (d.tenants && d.platform && x ? new AppendixPublicService(d, x, () => c.now()) : null),
  },
];
