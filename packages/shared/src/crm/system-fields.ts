// Trường hệ thống của 6 entity (D56, Cài đặt › Trường dữ liệu — prototype L932–960): luôn có, không xoá, không đổi nhãn / kiểu.
// Bảng `custom_field_def` chỉ chứa trường người dùng định nghĩa; GET /v1/settings/fields ghép hai nguồn (hệ thống trước).
import type { CustomFieldDef, CustomFieldEntity, CustomFieldPlace } from '../custom-fields/values';

const ALL: Record<CustomFieldPlace, boolean> = { list: true, kanban: true, form: true, filter: true, detail: true, export: true };
const sys = (key: string, label: string, type: string, extra: Partial<CustomFieldDef> = {}): CustomFieldDef => ({
  key,
  label,
  type,
  options: '',
  required: true,
  ai: false,
  sys: true,
  visible_in: { ...ALL },
  roles: [],
  condition: '',
  ...extra,
});
const noKanban = { visible_in: { ...ALL, kanban: false } };

export const SYSTEM_FIELDS: Record<CustomFieldEntity, CustomFieldDef[]> = {
  contact: [
    sys('full_name', 'Họ tên', 'text'),
    sys('phone', 'Số điện thoại', 'phone', noKanban),
    sys('email', 'Email', 'email', { required: false, ...noKanban }),
  ],
  ticket: [sys('title', 'Tiêu đề', 'text'), sys('priority', 'Mức ưu tiên', 'picklist', { options: 'Cao/Trung bình/Thấp' })],
  order: [
    sys('code', 'Mã đơn', 'text'),
    sys('amount', 'Giá trị đơn', 'currency'),
    sys('pay_status', 'Trạng thái TT', 'picklist', { options: 'Đã thanh toán/Đã cọc/Chờ cọc', required: false }),
  ],
  product: [
    sys('name', 'Tên sản phẩm', 'text'),
    sys('category', 'Danh mục', 'picklist', { options: 'Liệu trình/Combo/Gói năm/Dịch vụ lẻ' }),
    sys('price', 'Giá niêm yết', 'currency', noKanban),
    sys('duration', 'Thời lượng', 'number', {
      required: false,
      visible_in: { list: false, kanban: false, form: true, filter: false, detail: true, export: true },
      condition: 'Hiển thị khi Danh mục = Liệu trình',
    }),
  ],
  quote: [sys('code', 'Mã báo giá', 'text'), sys('contact', 'Khách hàng', 'text'), sys('total', 'Tổng tiền', 'currency')],
  appointment: [sys('service', 'Dịch vụ', 'text'), sys('start_at', 'Thời gian', 'date'), sys('staff', 'Nhân viên', 'text', { required: false })],
};

/** Nơi hiển thị mặc định của trường tuỳ biến mới (prototype: form / chi tiết / xuất bật). */
export const NEW_FIELD_PLACES: Record<CustomFieldPlace, boolean> = { list: false, kanban: false, form: true, filter: false, detail: true, export: true };
