// Public API của module customers.
export { CustomersScreen } from './screens/CustomersScreen';
// Dùng chung cho chứng từ bán hàng (chọn khách / người phụ trách).
export { contactsQuery, membersQuery } from './api';
export type { ContactRow, Member } from './types';
