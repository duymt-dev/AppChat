// Danh mục gói AppChat — seed theo prototype (fixtures/prototype-parity/settings.json → billing; sinh bằng script một lần,
// TIP-009). Nguồn sự thật lúc chạy là bảng `plan` ở DB nền tảng (seed idempotent theo key, Quản trị nền tảng sửa — TIP-040);
// bảng so sánh / gói credit / tài nguyên mua thêm là cấu hình hiển thị + giá (TIP-010 lập hoá đơn theo đây — DC-032).
// Hạn mức `null` = không giới hạn / tuỳ chỉnh. Tiền là string VND; `price_month = null` = Liên hệ (Enterprise).

export interface PlanSeed {
  key: string;
  segment: 'personal' | 'business';
  name: string;
  price_month: string | null;
  desc: string;
  popular: boolean;
  features: string[];
  max_users: number | null;
  max_channels: number | null;
  max_agents: number | null;
  credits_month: number | null;
  sort: number;
}

export const PLAN_SEEDS: readonly PlanSeed[] = [
  {
    key: 'free',
    segment: 'personal',
    name: 'Miễn phí',
    price_month: '0',
    desc: 'Bắt đầu trải nghiệm AppChat',
    popular: false,
    features: [
      '1 người dùng',
      '1 kênh kết nối',
      '1 AI Agent',
      '500 credit / tháng',
      'CRM cơ bản · 500 liên hệ',
      'Hỗ trợ cộng đồng',
    ],
    max_users: 1,
    max_channels: 1,
    max_agents: 1,
    credits_month: 500,
    sort: 1,
  },
  {
    key: 'personal',
    segment: 'personal',
    name: 'Cá nhân',
    price_month: '2030000',
    desc: 'Cá nhân hoá & bán hàng đa kênh',
    popular: false,
    features: [
      '1 người dùng',
      '3 kênh kết nối',
      'AI tiêu chuẩn + nâng cao',
      '3.000 credit / tháng',
      'CRM + pipeline + báo giá',
      'Tickets cơ bản · Quick-reply',
    ],
    max_users: 1,
    max_channels: 3,
    max_agents: 2,
    credits_month: 3000,
    sort: 2,
  },
  {
    key: 'personal_pro',
    segment: 'personal',
    name: 'Cá nhân Pro',
    price_month: '5090000',
    desc: 'Toàn bộ sức mạnh cho cá nhân',
    popular: true,
    features: [
      '1 người dùng',
      '8 kênh kết nối',
      'AI toàn bộ cấp độ',
      '10.000 credit / tháng',
      'Marketing + Loyalty',
      'Ưu tiên hỗ trợ 24/7',
    ],
    max_users: 1,
    max_channels: 8,
    max_agents: 5,
    credits_month: 10000,
    sort: 3,
  },
  {
    key: 'personal_max',
    segment: 'personal',
    name: 'Cá nhân Max',
    price_month: '10190000',
    desc: 'Cá nhân chuyên nghiệp tối đa',
    popular: false,
    features: [
      '1 người dùng',
      '19 kênh kết nối',
      'AI toàn bộ cấp độ',
      '25.000 credit / tháng',
      'AI Governance + RAG mở rộng',
      'Hỗ trợ ưu tiên cao nhất',
    ],
    max_users: 1,
    max_channels: 19,
    max_agents: null,
    credits_month: 25000,
    sort: 4,
  },
  {
    key: 'team',
    segment: 'business',
    name: 'Team',
    price_month: '5900000',
    desc: 'Đội nhóm nhỏ bắt đầu đa kênh',
    popular: false,
    features: [
      '5 người dùng',
      '5 kênh kết nối',
      '2 AI Agent',
      '20.000 credit / tháng',
      'CRM + Loyalty đầy đủ',
      'Hỗ trợ trong giờ',
    ],
    max_users: 5,
    max_channels: 5,
    max_agents: 2,
    credits_month: 20000,
    sort: 5,
  },
  {
    key: 'business',
    segment: 'business',
    name: 'Business',
    price_month: '12900000',
    desc: 'Vận hành chuyên nghiệp đa phòng ban',
    popular: true,
    features: [
      '8 người dùng',
      '10 kênh kết nối',
      '5 AI Agent',
      '50.000 credit / tháng',
      'Marketing + phân khúc',
      'Hỗ trợ ưu tiên',
    ],
    max_users: 8,
    max_channels: 10,
    max_agents: 5,
    credits_month: 50000,
    sort: 6,
  },
  {
    key: 'ultimate',
    segment: 'business',
    name: 'Ultimate',
    price_month: '24900000',
    desc: 'Toàn bộ năng lực cho doanh nghiệp',
    popular: false,
    features: [
      '15 người dùng',
      'Kênh không giới hạn',
      'AI Agent không giới hạn',
      '200.000 credit / tháng',
      'AI Governance + RAG mở rộng',
      'CSM riêng · SLA 99.9%',
    ],
    max_users: 15,
    max_channels: null,
    max_agents: null,
    credits_month: 200000,
    sort: 7,
  },
  {
    key: 'enterprise',
    segment: 'business',
    name: 'Enterprise',
    price_month: null,
    desc: 'Triển khai riêng theo nhu cầu',
    popular: false,
    features: [
      'User tuỳ chỉnh',
      'Hạ tầng riêng',
      'AI Governance ISO 42001',
      'Credit tuỳ chỉnh',
      'Tích hợp sâu ERP',
      'CSM + onsite',
    ],
    max_users: null,
    max_channels: null,
    max_agents: null,
    credits_month: null,
    sort: 8,
  },
];

export interface CreditPack {
  key: string;
  credits: number;
  price: string;
  bonus: number;
  popular: boolean;
}

export const CREDIT_PACKS: readonly CreditPack[] = [
  { key: 'credit_500', credits: 500, price: '500000', bonus: 0, popular: false },
  { key: 'credit_1000', credits: 1050, price: '1000000', bonus: 5, popular: true },
  { key: 'credit_2000', credits: 2200, price: '2000000', bonus: 10, popular: false },
  { key: 'credit_5000', credits: 5750, price: '5000000', bonus: 15, popular: false },
];

export interface Addon {
  key: string;
  kind: 'user' | 'channel';
  price: string;
  period: 'month';
}

export const ADDONS: readonly Addon[] = [
  { key: 'addon_user', kind: 'user', price: '150000', period: 'month' },
  { key: 'addon_channel', kind: 'channel', price: '200000', period: 'month' },
];

export interface CompareGroup {
  group: string;
  rows: { feature: string; personal: string[]; business: string[] }[];
}

export const PLAN_COMPARE: readonly CompareGroup[] = [
  {
    group: 'platform',
    rows: [
      { feature: 'Người dùng', personal: ['1', '1', '1', '1'], business: ['5', '8', '15', 'Tuỳ chỉnh'] },
      {
        feature: 'Kênh kết nối',
        personal: ['1', '3', '8', '19'],
        business: ['5', '10', 'Không giới hạn', 'Không giới hạn'],
      },
      { feature: 'Phân quyền vai trò', personal: ['—', '—', '✓', '✓'], business: ['✓', '✓', '✓', '✓'] },
      {
        feature: 'Nền tảng kết nối',
        personal: ['—', 'Cơ bản', '✓', '✓'],
        business: ['✓', '✓', '✓', '✓ + tuỳ biến'],
      },
    ],
  },
  {
    group: 'dashboard',
    rows: [
      { feature: 'Dashboard tổng quan', personal: ['✓', '✓', '✓', '✓'], business: ['✓', '✓', '✓', '✓'] },
    ],
  },
  {
    group: 'assistant',
    rows: [
      { feature: 'Chat ra lệnh nghiệp vụ', personal: ['✓', '✓', '✓', '✓'], business: ['✓', '✓', '✓', '✓'] },
      {
        feature: 'Gợi ý xử lý theo ngữ cảnh',
        personal: ['—', '✓', '✓', '✓'],
        business: ['✓', '✓', '✓', '✓'],
      },
      {
        feature: 'Phiên trò chuyện & nhật ký',
        personal: ['✓', '✓', '✓', '✓'],
        business: ['✓', '✓', '✓', '✓'],
      },
    ],
  },
  {
    group: 'inbox',
    rows: [
      { feature: 'Hộp thư hợp nhất đa kênh', personal: ['✓', '✓', '✓', '✓'], business: ['✓', '✓', '✓', '✓'] },
      {
        feature: 'Gán & phân luồng hội thoại',
        personal: ['—', '✓', '✓', '✓'],
        business: ['✓', '✓', '✓', '✓'],
      },
      {
        feature: 'Quick-reply / mẫu trả lời',
        personal: ['Cơ bản', '✓', '✓', '✓'],
        business: ['✓', '✓', '✓', '✓'],
      },
    ],
  },
  {
    group: 'crm',
    rows: [
      {
        feature: 'Liên hệ (CRM)',
        personal: ['500', 'Pipeline', 'Nâng cao', 'Không giới hạn'],
        business: ['✓', '✓', '✓', '✓'],
      },
      { feature: 'Báo giá · Hợp đồng · Đơn', personal: ['—', '✓', '✓', '✓'], business: ['✓', '✓', '✓', '✓'] },
      { feature: 'Sản phẩm', personal: ['—', '✓', '✓', '✓'], business: ['✓', '✓', '✓', '✓'] },
      { feature: 'Loyalty', personal: ['—', '—', '✓', '✓'], business: ['✓', '✓', '✓', '✓'] },
    ],
  },
  {
    group: 'tickets',
    rows: [
      { feature: 'Tạo & xử lý ticket', personal: ['Cơ bản', '✓', '✓', '✓'], business: ['✓', '✓', '✓', '✓'] },
      { feature: 'SLA & leo thang', personal: ['—', '✓', '✓', '✓'], business: ['✓', '✓', '✓', '✓'] },
    ],
  },
  {
    group: 'marketing',
    rows: [
      { feature: 'Email Marketing', personal: ['—', '✓', '✓', '✓'], business: ['✓', '✓', '✓', '✓'] },
      { feature: 'Phân khúc khách hàng', personal: ['—', '✓', '✓', '✓'], business: ['—', '✓', '✓', '✓'] },
    ],
  },
  {
    group: 'booking',
    rows: [
      { feature: 'Đặt & quản lý lịch hẹn', personal: ['—', '✓', '✓', '✓'], business: ['✓', '✓', '✓', '✓'] },
      { feature: 'Nhắc lịch tự động', personal: ['—', '✓', '✓', '✓'], business: ['✓', '✓', '✓', '✓'] },
    ],
  },
  {
    group: 'agents',
    rows: [
      {
        feature: 'Số AI Agent',
        personal: ['1', '2', '5', 'Không giới hạn'],
        business: ['2', '5', 'Không giới hạn', 'Không giới hạn'],
      },
      {
        feature: 'Mức AI',
        personal: ['Tiêu chuẩn', 'Tiêu chuẩn + Nâng cao', 'Toàn bộ', 'Toàn bộ'],
        business: ['Toàn bộ', 'Toàn bộ', 'Toàn bộ', 'Toàn bộ'],
      },
      {
        feature: 'Credit / tháng',
        personal: ['500', '3.000', '10.000', '25.000'],
        business: ['20.000', '50.000', '200.000', 'Tuỳ chỉnh'],
      },
      {
        feature: 'AI Governance',
        personal: ['—', '—', '✓', '✓'],
        business: ['—', 'Cơ bản', '✓', '✓ + audit'],
      },
    ],
  },
  {
    group: 'service',
    rows: [
      {
        feature: 'Kênh hỗ trợ',
        personal: ['Cộng đồng', 'Trong giờ', '24/7', 'Ưu tiên cao'],
        business: ['Trong giờ', 'Ưu tiên', 'CSM riêng', 'CSM + onsite'],
      },
      {
        feature: 'SLA cam kết',
        personal: ['—', '—', '99.5%', '99.5%'],
        business: ['99%', '99.5%', '99.9%', '99.95%'],
      },
    ],
  },
];
