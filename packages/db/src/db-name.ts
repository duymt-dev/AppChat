// Tên DB tenant: `ws_` + 12 ký tự hex từ uuid workspace — không bao giờ nhận tên DB từ client (tenant-db §4).
const DB_NAME = /^ws_[a-z0-9]{12}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** uuidv7 có 48 bit đầu là thời gian → lấy 12 ký tự cuối (phần ngẫu nhiên) để tránh trùng giữa workspace tạo cùng lúc. */
export function tenantDbName(workspaceId: string): string {
  if (!UUID.test(workspaceId)) throw new Error('workspaceId không phải uuid');
  return `ws_${workspaceId.replace(/-/g, '').slice(-12).toLowerCase()}`;
}

/** Chặn mọi tên không đúng dạng trước khi ghép vào SQL động (CREATE / DROP DATABASE). */
export function assertTenantDbName(name: string): string {
  if (!DB_NAME.test(name)) throw new Error(`Tên DB tenant không hợp lệ: ${name}`);
  return name;
}

/** Quote identifier Postgres (đã validate ở trên nên chỉ là lớp bảo vệ thứ hai). */
export const quoteIdent = (name: string) => `"${name.replace(/"/g, '""')}"`;
