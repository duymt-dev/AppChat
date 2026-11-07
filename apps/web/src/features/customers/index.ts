// Public API của module customers.
export { CustomersScreen } from './screens/CustomersScreen';
// Dùng chung cho chứng từ bán hàng (chọn khách / người phụ trách).
export { contactsQuery, membersQuery } from './api';
export type { ContactRow, Member } from './types';
// TIP-025b §D.3: form sửa / chuyển phụ trách dùng chung — chỉ host toàn cục (app/(app)/_crm-forms/ContactFormHost) dùng.
export { ContactFormModal, type EditTarget } from './components/ContactFormModal';
export { TransferOwnerModal, type TransferTarget } from './components/TransferOwnerModal';
export { contactEditQuery } from './api';
export { prefillContactForm } from './ui-commands';
