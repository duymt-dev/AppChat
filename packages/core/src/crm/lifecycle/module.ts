// Provider vòng đời khách (TIP-015f) — CrmModule gộp vào danh sách provider; không đăng ký handler contact.delete thứ hai (facade cũ chỉ
// re-export class này).
import { ContactDeleteHandler } from './delete.handler';
import { ContactRestoreHandler } from './restore.handler';
import { ContactDeletedListHandler } from './deleted-list.handler';

export const LIFECYCLE_HANDLERS = [ContactDeleteHandler, ContactRestoreHandler, ContactDeletedListHandler];
