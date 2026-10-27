// Mock data for AppChat Ultimate prototype
const pick = (arr, i) => arr[i % arr.length];
const hueFromName = (s) => {
  let h = 0; for (let c of s) h = (h*31 + c.charCodeAt(0)) % 360;
  return h;
};
const avatarBgFromName = (s) => {
  const h = hueFromName(s);
  return `hsl(${h} 55% 48%)`;
};
const initials = (name) => name.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();

// Conversations for Messages inbox
const CONVERSATIONS = [
  { id: 'c1', name: 'Chị Lan — Shop Bé Na', channel: 'zalo',
    last: 'Shop ơi cho mình hỏi mẫu váy trẻ em in họa tiết size 3-5 tuổi còn không ạ?',
    time: '11:42', unread: 3, pinned: true, online: true,
    tags: ['VIP', 'Zalo OA'], assignee: 'Trâm', aiMode: 'copilot',
    channelAccount: 'OA · Shop Bé Na',
  },
  { id: 'c2', name: 'Nguyễn Trung Hiếu', channel: 'facebook',
    last: 'Ok mình chuyển khoản luôn nhé, số TK gửi lại mình với',
    time: '11:38', unread: 1, pinned: false, online: true,
    tags: ['Hot lead'], assignee: 'Minh', aiMode: 'manual',
    channelAccount: 'Page · MomBaby Store',
  },
  { id: 'c3', name: 'Linh Phạm', channel: 'shopee',
    last: '[Khách hỏi về đơn #SP290411] Hàng bao giờ giao được ạ?',
    time: '11:24', unread: 0, pinned: false, online: false,
    tags: ['Order tracking'], assignee: 'Claude Cowork', aiMode: 'auto',
    channelAccount: 'Shop · mombaby.vn',
  },
  { id: 'c4', name: 'Etsy · ashleyfowler', channel: 'etsy',
    last: 'Hi! Can this item be shipped to Canada? What\'s the estimated delivery time?',
    time: '10:55', unread: 2, pinned: false, online: false,
    tags: ['International', 'Etsy'], assignee: 'Claude Cowork', aiMode: 'copilot',
    channelAccount: 'Store · BamboeHome',
  },
  { id: 'c5', name: 'Trần Minh Khoa', channel: 'tiktok',
    last: 'Giá sỉ 100 cái loại áo này bao nhiêu anh?',
    time: '10:41', unread: 0, pinned: false, online: true,
    tags: ['Wholesale'], assignee: 'Minh', aiMode: 'copilot',
    channelAccount: 'TikTok Shop · @bamboehome',
  },
  { id: 'c6', name: 'Amazon · J. Rodriguez', channel: 'amazon',
    last: 'Return request for order #114-7823449 — product arrived damaged',
    time: '09:30', unread: 0, pinned: false, online: false,
    tags: ['Return'], assignee: 'Hương', aiMode: 'manual',
    channelAccount: 'Store · BamboeHome-US',
  },
  { id: 'c7', name: 'Phạm Quỳnh Anh', channel: 'zalo',
    last: 'Đã chuyển khoản 890.000đ — gửi ảnh bill nha shop',
    time: '09:12', unread: 0, pinned: false, online: false,
    tags: ['Paid'], assignee: 'Claude Cowork', aiMode: 'auto',
    channelAccount: 'OA · Shop Bé Na',
  },
  { id: 'c8', name: '1688 · Guangzhou Supplier', channel: '1688',
    last: '您好，关于 MOQ 500 件的合作，我们可以给 8% 折扣',
    time: '08:47', unread: 1, pinned: true, online: false,
    tags: ['Supplier', 'CN'], assignee: 'Minh', aiMode: 'copilot',
    channelAccount: 'Sourcing · Alibaba',
  },
  { id: 'c9', name: 'WhatsApp · Emma S.', channel: 'whatsapp',
    last: 'Voice message · 0:42',
    time: 'Hôm qua', unread: 0, pinned: false, online: false,
    tags: ['Voice'], assignee: 'Minh', aiMode: 'copilot',
    channelAccount: 'Business · +84 907 711 888',
  },
  { id: 'c10', name: 'Web · visitor_0x41ac', channel: 'web',
    last: 'Chào bạn, shop có bán buôn không ạ?',
    time: 'Hôm qua', unread: 0, pinned: false, online: true,
    tags: ['New'], assignee: 'Claude Cowork', aiMode: 'auto',
    channelAccount: 'Livechat · bamboehome.vn',
  },
];

// Active conversation thread for Chị Lan
const ACTIVE_THREAD = [
  { id: 'm1', from: 'them', time: '11:32', text: 'Em chào shop ạ! Cho chị hỏi mẫu váy trẻ em họa tiết hoa mà chị thấy trên TikTok còn không ạ?' },
  { id: 'm2', from: 'them', time: '11:32', attach: { type: 'image', label: 'Ảnh tham khảo từ TikTok', w: 140, h: 180 } },
  { id: 'm3', from: 'us', time: '11:34', text: 'Dạ chào chị Lan ạ! Mẫu váy hoa nhí đó em còn đủ size 2–7 tuổi chị nhé 💚', agent: 'Trâm' },
  { id: 'm4', from: 'us', time: '11:34', attach: { type: 'card', product: { name: 'Váy bé gái họa tiết hoa nhí', price: '189.000đ', sku: 'VBG-0412', stock: 'Còn 47 cái', img: 'v1' } } },
  { id: 'm5', from: 'them', time: '11:36', text: 'Ok chị lấy size 3–5 tuổi. Hàng còn không em? Giao về Đống Đa bao lâu vậy?' },
  { id: 'm6', from: 'them', time: '11:42', text: 'Shop ơi cho mình hỏi mẫu váy trẻ em in họa tiết size 3-5 tuổi còn không ạ?', unread: true },
];

// Suppliers for Sourcing
const SUPPLIERS = [
  { id: 's1', name: 'Guangzhou Textile Co.', platform: '1688', country: 'CN', rating: 4.8, moq: 100, lead: '7-12 ngày', products: 124, status: 'verified', trend: 'up' },
  { id: 's2', name: 'Shenzhen Electronics', platform: 'Alibaba', country: 'CN', rating: 4.6, moq: 50, lead: '10-15 ngày', products: 89, status: 'verified', trend: 'flat' },
  { id: 's3', name: 'Yiwu Home Goods', platform: '1688', country: 'CN', rating: 4.9, moq: 200, lead: '5-9 ngày', products: 312, status: 'preferred', trend: 'up' },
  { id: 's4', name: 'Hanoi Craft Partners', platform: 'Local', country: 'VN', rating: 4.7, moq: 20, lead: '2-4 ngày', products: 56, status: 'verified', trend: 'up' },
  { id: 's5', name: 'Bangkok Fashion Hub', platform: 'Alibaba', country: 'TH', rating: 4.4, moq: 150, lead: '8-14 ngày', products: 67, status: 'new', trend: 'down' },
];

const SOURCING_RESULTS = [
  { name: 'Túi vải canvas trơn 12oz', supplier: 'Yiwu Home Goods', price: '¥8.50', priceVnd: '≈ 30.600đ', moq: 200, match: 96, tag: 'Best match', img: 'p1' },
  { name: 'Canvas tote bag heavy-duty', supplier: 'Guangzhou Textile Co.', price: '¥9.20', priceVnd: '≈ 33.100đ', moq: 100, match: 92, tag: 'Low MOQ', img: 'p2' },
  { name: 'Organic cotton shopper bag', supplier: 'Hanoi Craft Partners', price: '38.000đ', priceVnd: 'nội địa', moq: 20, match: 88, tag: 'Made in VN', img: 'p3' },
  { name: 'Túi tote in họa tiết custom', supplier: 'Bangkok Fashion Hub', price: '฿42.00', priceVnd: '≈ 31.000đ', moq: 150, match: 85, tag: 'Custom print', img: 'p4' },
  { name: 'Eco jute shopping bag', supplier: 'Yiwu Home Goods', price: '¥12.40', priceVnd: '≈ 44.600đ', moq: 300, match: 79, tag: 'Eco', img: 'p5' },
  { name: 'Canvas bag w/ leather handle', supplier: 'Guangzhou Textile Co.', price: '¥15.80', priceVnd: '≈ 56.800đ', moq: 100, match: 74, tag: 'Premium', img: 'p6' },
];

// Tickets
const TICKETS = [
  { id: '#TKT-2041', title: 'Khách yêu cầu hoàn tiền đơn SP290411', customer: 'Linh Phạm', channel: 'shopee', priority: 'high', status: 'open', assignee: 'Hương', age: '2h', category: 'Refund' },
  { id: '#TKT-2040', title: 'Đơn hàng giao sai mẫu', customer: 'Nguyễn T. Hiếu', channel: 'facebook', priority: 'high', status: 'in_progress', assignee: 'Minh', age: '3h', category: 'Delivery' },
  { id: '#TKT-2039', title: 'Hỏi chính sách đổi size', customer: 'Chị Lan', channel: 'zalo', priority: 'medium', status: 'open', assignee: 'Claude Cowork', age: '4h', category: 'Policy' },
  { id: '#TKT-2038', title: 'Return request — damaged product', customer: 'J. Rodriguez', channel: 'amazon', priority: 'medium', status: 'waiting', assignee: 'Hương', age: '6h', category: 'Return' },
  { id: '#TKT-2037', title: 'Chưa nhận được mã vận đơn', customer: 'Trần M. Khoa', channel: 'tiktok', priority: 'low', status: 'resolved', assignee: 'Claude Cowork', age: '1d', category: 'Shipping' },
  { id: '#TKT-2036', title: 'Livestream bị lỗi hình', customer: 'Phạm Q. Anh', channel: 'zalo', priority: 'low', status: 'resolved', assignee: 'Minh', age: '1d', category: 'Technical' },
];

const SCHEDULES = [
  { id: 'e1', title: 'Demo AppChat cho Dược phẩm An Khang', time: '09:00 — 09:45', date: 'Hôm nay', type: 'meeting', attendees: ['An Khang Ltd.', 'Minh', 'Trâm'], channel: 'Google Meet' },
  { id: 'e2', title: 'Gọi lại khách lead — Chị Lan (Shop Bé Na)', time: '10:30 — 10:45', date: 'Hôm nay', type: 'call', attendees: ['Chị Lan'], channel: 'Zalo Call' },
  { id: 'e3', title: 'Weekly review pipeline Sourcing', time: '14:00 — 15:00', date: 'Hôm nay', type: 'meeting', attendees: ['Team Sourcing', 'CMO'], channel: 'AppChat Meet' },
  { id: 'e4', title: 'Onboarding workspace cho MomBaby', time: '16:00 — 16:30', date: 'Hôm nay', type: 'meeting', attendees: ['MomBaby', 'Hương'], channel: 'Zoom' },
  { id: 'e5', title: 'Ký hợp đồng năm với Yiwu Home Goods', time: '09:30 — 10:00', date: 'Mai, 21/04', type: 'meeting', attendees: ['Yiwu Home Goods'], channel: 'AppChat Meet' },
];

const CALL_LOGS = [
  { id: 'cl1', name: 'Chị Lan — Shop Bé Na', channel: 'zalo', dir: 'out', status: 'answered', duration: '04:12', time: '11:28', recording: true, summary: 'Chốt đơn mẫu váy họa tiết 2 cái size 4-5. Hẹn thanh toán COD.' },
  { id: 'cl2', name: 'Nguyễn T. Hiếu', channel: 'facebook', dir: 'in', status: 'answered', duration: '02:45', time: '10:51', recording: true, summary: 'Khách hỏi chính sách đổi trả, đã gửi link FAQ.' },
  { id: 'cl3', name: 'Trần M. Khoa', channel: 'tiktok', dir: 'out', status: 'missed', duration: '—', time: '10:11', recording: false, summary: 'Không bắt máy. AI đã gửi tin Zalo follow-up.' },
  { id: 'cl4', name: 'Amazon · J. Rodriguez', channel: 'whatsapp', dir: 'in', status: 'answered', duration: '06:30', time: '09:02', recording: true, summary: 'Khiếu nại hàng lỗi. Đã tạo ticket #TKT-2038.' },
  { id: 'cl5', name: 'Linh Phạm', channel: 'shopee', dir: 'out', status: 'answered', duration: '01:58', time: '08:44', recording: true, summary: 'Xác nhận địa chỉ giao lại cho đơn SP290411.' },
];

// Broadcast campaigns
const CAMPAIGNS = [
  { id: 'cp1', name: 'Flash Sale 20/04 — ZNS', channel: 'zns', status: 'running', segment: 'VIP · 12,480 KH', sent: 8420, open: 6890, click: 2140, conv: 312, revenue: '48.7M', progress: 67 },
  { id: 'cp2', name: 'Ra mắt BST Hè 2026 — Email', channel: 'email', status: 'scheduled', segment: 'All subscribers · 34,210', sent: 0, open: 0, click: 0, conv: 0, revenue: '—', progress: 0, when: '21/04 · 09:00' },
  { id: 'cp3', name: 'Remind giỏ hàng bỏ quên — SMS', channel: 'sms', status: 'running', segment: 'Cart abandoners · 1,892', sent: 1650, open: 1320, click: 410, conv: 78, revenue: '12.4M', progress: 87 },
  { id: 'cp4', name: 'Khảo sát CSAT Q1 — ZNS', channel: 'zns', status: 'completed', segment: 'Đã mua 90 ngày · 4,560', sent: 4560, open: 4012, click: 3450, conv: 2890, revenue: '—', progress: 100 },
  { id: 'cp5', name: 'Cross-sell phụ kiện — Email', channel: 'email', status: 'draft', segment: 'Đã mua áo · 8,340', sent: 0, open: 0, click: 0, conv: 0, revenue: '—', progress: 0 },
];

// Automation workflows
const WORKFLOWS = [
  { id: 'wf1', name: 'AI tự trả lời giờ nghỉ (22h–7h)', status: 'on', triggers: 1240, success: 96, channel: 'all', lastRun: '3 phút trước' },
  { id: 'wf2', name: 'Phân luồng khách theo intent (Sourcing vs. Sale)', status: 'on', triggers: 8930, success: 94, channel: 'zalo,fb', lastRun: 'vừa xong' },
  { id: 'wf3', name: 'Tạo ticket tự động khi có keyword "hoàn tiền"', status: 'on', triggers: 412, success: 99, channel: 'all', lastRun: '12 phút trước' },
  { id: 'wf4', name: 'Chào mừng khách mới + gợi ý sản phẩm', status: 'on', triggers: 2130, success: 88, channel: 'web,fb', lastRun: '1 phút trước' },
  { id: 'wf5', name: 'Follow-up 24h sau khi khách xem sản phẩm', status: 'paused', triggers: 890, success: 73, channel: 'zns,fb', lastRun: '2 ngày trước' },
  { id: 'wf6', name: 'Remind thanh toán đơn chưa chuyển khoản', status: 'on', triggers: 340, success: 91, channel: 'zalo,sms', lastRun: '25 phút trước' },
];

const AI_AGENTS = [
  { id: 'a1', name: 'Sales Agent', role: 'Tư vấn & chốt đơn', status: 'on', conv: 1284, resolve: 89, satisfaction: 4.6, persona: 'Nhiệt tình, chủ động chốt đơn', model: 'Claude Haiku 4.5' },
  { id: 'a2', name: 'Sourcing Agent', role: 'Tìm nguồn & so sánh giá', status: 'on', conv: 312, resolve: 94, satisfaction: 4.8, persona: 'Chuyên gia supply chain', model: 'Claude Sonnet 4.5' },
  { id: 'a3', name: 'Support Agent', role: 'Xử lý ticket & khiếu nại', status: 'on', conv: 678, resolve: 82, satisfaction: 4.4, persona: 'Kiên nhẫn, empathy cao', model: 'Claude Haiku 4.5' },
  { id: 'a4', name: 'International Agent', role: 'Hỗ trợ khách EN/CN', status: 'draft', conv: 0, resolve: 0, satisfaction: 0, persona: 'Đa ngôn ngữ, lịch sự', model: 'Claude Sonnet 4.5' },
];

// Files / Knowledge
const FILES = [
  { id: 'f1', name: 'Catalogue BST Hè 2026.pdf', type: 'pdf', size: '12.4 MB', by: 'Trâm', date: '18/04/2026', source: 'Upload', ai: true, tags: ['Catalogue', 'Hè 2026'] },
  { id: 'f2', name: 'Bảng giá sỉ — Dropship Q2.xlsx', type: 'xlsx', size: '840 KB', by: 'Minh', date: '17/04/2026', source: 'Upload', ai: true, tags: ['Giá sỉ'] },
  { id: 'f3', name: 'Chính sách đổi trả 2026.docx', type: 'docx', size: '124 KB', by: 'Hương', date: '15/04/2026', source: 'Upload', ai: true, tags: ['Policy'] },
  { id: 'f4', name: 'Ảnh sản phẩm — Shoot April', type: 'folder', size: '312 files', by: 'Trâm', date: '14/04/2026', source: 'Drive', ai: false, tags: ['Ảnh'] },
  { id: 'f5', name: 'Video hướng dẫn mặc váy hoa.mp4', type: 'video', size: '48.2 MB', by: 'AI (from Zalo)', date: '12/04/2026', source: 'Zalo · Chị Lan', ai: true, tags: ['Video', 'Tutorial'] },
  { id: 'f6', name: 'Hợp đồng Yiwu Home Goods.pdf', type: 'pdf', size: '2.1 MB', by: 'Minh', date: '10/04/2026', source: '1688 chat', ai: false, tags: ['Contract', 'Sourcing'] },
  { id: 'f7', name: 'FAQ — Sourcing từ 1688.md', type: 'md', size: '18 KB', by: 'Huyền', date: '08/04/2026', source: 'Internal', ai: true, tags: ['FAQ', 'Sourcing'] },
  { id: 'f8', name: 'Báo cáo KPI tháng 3.pptx', type: 'pptx', size: '6.8 MB', by: 'CMO', date: '05/04/2026', source: 'Upload', ai: false, tags: ['Report'] },
];

// Reports data
const KPI = [
  { label: 'Hội thoại', value: '24,810', delta: '+18.2%', trend: 'up', sub: 'Tuần này vs tuần trước' },
  { label: 'Tỷ lệ AI xử lý', value: '68.4%', delta: '+4.1pp', trend: 'up', sub: '68.4% không cần agent can thiệp' },
  { label: 'Thời gian phản hồi', value: '42s', delta: '-23s', trend: 'up', sub: 'Trung bình lần đầu' },
  { label: 'Doanh thu từ chat', value: '1.24B₫', delta: '+32%', trend: 'up', sub: 'Attributed to conversations' },
];

// Team members for settings
const TEAM = [
  { name: 'Mai Đình Ngọc', role: 'Admin · Giám đốc', email: 'ngocmd@mediasoft.vn', dept: 'Ban giám đốc', online: true },
  { name: 'Nguyễn Thùy Trâm', role: 'Sales Lead', email: 'tramnt@appchat.vn', dept: 'Kinh doanh', online: true },
  { name: 'Lê Quốc Minh', role: 'Sourcing Lead', email: 'minhlq@appchat.vn', dept: 'Sourcing', online: true },
  { name: 'Phạm Thu Hương', role: 'Customer Success', email: 'huongpt@appchat.vn', dept: 'CS', online: false },
  { name: 'Đỗ Thị Huyền', role: 'Content Ops', email: 'huyendt@appchat.vn', dept: 'Marketing', online: true },
  { name: 'Trần Văn Khánh', role: 'Developer', email: 'khanhtv@appchat.vn', dept: 'IT', online: false },
];

const CHANNELS_CONNECTED = [
  { name: 'Zalo OA — Shop Bé Na', channel: 'zalo', status: 'connected', msgs: '12,480', acct: 'OA ID: 1234567890' },
  { name: 'Facebook Page — MomBaby Store', channel: 'facebook', status: 'connected', msgs: '8,930', acct: 'FB-84920' },
  { name: 'TikTok Shop — @bamboehome', channel: 'tiktok', status: 'connected', msgs: '3,210', acct: 'Seller Center' },
  { name: 'Shopee — mombaby.vn', channel: 'shopee', status: 'connected', msgs: '5,412', acct: 'Mall shop' },
  { name: 'Amazon — BamboeHome-US', channel: 'amazon', status: 'connected', msgs: '1,840', acct: 'NA marketplace' },
  { name: 'Etsy — BamboeHome', channel: 'etsy', status: 'connected', msgs: '920', acct: 'Store US' },
  { name: '1688 — Sourcing channel', channel: '1688', status: 'connected', msgs: '412', acct: 'Buyer account' },
  { name: 'WhatsApp Business', channel: 'whatsapp', status: 'error', msgs: '128', acct: 'Token expired' },
  { name: 'Instagram Business', channel: 'instagram', status: 'disconnected', msgs: '—', acct: 'Chưa kết nối' },
];

// Zoho-style Tasks / Meetings / Calls
const TASKS = [
  { id:'T-4021', subject:'Gọi xác nhận đơn SP290411 với Linh Phạm', due:'2026-04-20', dueLabel:'Hôm nay · 14:00', status:'Not Started', priority:'High', relatedTo:{type:'Deal', name:'Đơn Shopee · SP290411'}, contact:'Linh Phạm', owner:'Hương', channel:'shopee', overdue:false },
  { id:'T-4020', subject:'Gửi báo giá BST Hè 2026 cho Chị Lan', due:'2026-04-20', dueLabel:'Hôm nay · 16:30', status:'In Progress', priority:'High', relatedTo:{type:'Account', name:'Shop Bé Na'}, contact:'Chị Lan', owner:'Minh', channel:'zalo', overdue:false },
  { id:'T-4019', subject:'Theo dõi yêu cầu hoàn tiền SP290411', due:'2026-04-19', dueLabel:'Quá hạn 1 ngày', status:'In Progress', priority:'Highest', relatedTo:{type:'Case', name:'#TKT-2041'}, contact:'Linh Phạm', owner:'Hương', channel:'shopee', overdue:true },
  { id:'T-4018', subject:'Soạn email proposal cho MomBaby', due:'2026-04-21', dueLabel:'Mai · 10:00', status:'Not Started', priority:'Normal', relatedTo:{type:'Deal', name:'MomBaby · Onboarding'}, contact:'Chị Hạnh', owner:'Trâm', channel:'email', overdue:false },
  { id:'T-4017', subject:'Nhập kho 300 túi canvas từ Yiwu', due:'2026-04-22', dueLabel:'22/04 · 09:00', status:'Waiting for Input', priority:'Normal', relatedTo:{type:'Account', name:'Yiwu Home Goods'}, contact:'Li Wei', owner:'Minh', channel:'1688', overdue:false },
  { id:'T-4016', subject:'Review feedback khách J. Rodriguez', due:'2026-04-18', dueLabel:'Hoàn thành 18/04', status:'Completed', priority:'Normal', relatedTo:{type:'Case', name:'#TKT-2038'}, contact:'J. Rodriguez', owner:'Hương', channel:'amazon', overdue:false },
  { id:'T-4015', subject:'Chuẩn bị livestream Flash Sale 25/04', due:'2026-04-23', dueLabel:'23/04 · 08:00', status:'Not Started', priority:'High', relatedTo:{type:'Campaign', name:'Flash Sale 25/04'}, contact:'Team Marketing', owner:'Trâm', channel:'tiktok', overdue:false },
  { id:'T-4014', subject:'Gửi khảo sát CSAT cho khách tháng 3', due:'2026-04-17', dueLabel:'Hoàn thành 17/04', status:'Completed', priority:'Low', relatedTo:{type:'Campaign', name:'CSAT Q1'}, contact:'—', owner:'Claude Cowork', channel:'zns', overdue:false },
  { id:'T-4013', subject:'Cập nhật hợp đồng năm Yiwu Home Goods', due:'2026-04-25', dueLabel:'25/04', status:'Deferred', priority:'Normal', relatedTo:{type:'Account', name:'Yiwu Home Goods'}, contact:'Li Wei', owner:'Minh', channel:'1688', overdue:false },
];

const MEETINGS = [
  { id:'M-312', title:'Demo AppChat cho Dược phẩm An Khang', start:'2026-04-20T09:00', end:'2026-04-20T09:45', dateLabel:'Hôm nay · 09:00 — 09:45', location:'Google Meet', relatedTo:{type:'Deal', name:'An Khang · POC'}, host:'Minh', participants:['An Khang Ltd.','Minh','Trâm'], status:'Scheduled', type:'Demo' },
  { id:'M-311', title:'Weekly review pipeline Sourcing', start:'2026-04-20T14:00', end:'2026-04-20T15:00', dateLabel:'Hôm nay · 14:00 — 15:00', location:'AppChat Meet', relatedTo:{type:'Internal', name:'Sourcing Team'}, host:'Trâm', participants:['Team Sourcing','CMO'], status:'Scheduled', type:'Internal' },
  { id:'M-310', title:'Onboarding workspace cho MomBaby', start:'2026-04-20T16:00', end:'2026-04-20T16:30', dateLabel:'Hôm nay · 16:00 — 16:30', location:'Zoom', relatedTo:{type:'Account', name:'MomBaby'}, host:'Hương', participants:['MomBaby','Hương'], status:'Scheduled', type:'Onboarding' },
  { id:'M-309', title:'Ký hợp đồng năm với Yiwu Home Goods', start:'2026-04-21T09:30', end:'2026-04-21T10:00', dateLabel:'Mai · 09:30 — 10:00', location:'AppChat Meet', relatedTo:{type:'Account', name:'Yiwu Home Goods'}, host:'Minh', participants:['Yiwu Home Goods'], status:'Scheduled', type:'Contract' },
  { id:'M-308', title:'QBR với khách hàng VIP · Shop Bé Na', start:'2026-04-22T15:00', end:'2026-04-22T16:00', dateLabel:'22/04 · 15:00 — 16:00', location:'Zalo Call', relatedTo:{type:'Account', name:'Shop Bé Na'}, host:'Trâm', participants:['Chị Lan','Trâm','Minh'], status:'Scheduled', type:'QBR' },
  { id:'M-307', title:'Training team CSKH về Claude Cowork', start:'2026-04-18T10:00', end:'2026-04-18T11:30', dateLabel:'18/04 · 10:00', location:'AppChat Meet', relatedTo:{type:'Internal', name:'Team CS'}, host:'Trâm', participants:['Team CS (8)'], status:'Completed', type:'Training' },
];

// Contacts (Zoho CRM style)
const CONTACTS = [
  { id:'CT-1001', first:'Lan', last:'Nguyễn Thị', email:'lan@shopbena.vn', phone:'+84 909 123 456', title:'Chủ shop', company:'Shop Bé Na', account:'Shop Bé Na', owner:'Trâm', leadSource:'Zalo OA', tags:['VIP','Wholesale'], channels:['zalo','facebook'], lifecycle:'Customer', lastActivity:'2h trước · Zalo', score:92, city:'TP.HCM', country:'VN', createdAt:'12/01/2026', deals:3, totalValue:'128M₫', starred:true },
  { id:'CT-1002', first:'Hiếu', last:'Nguyễn Trung', email:'hieu.nguyen@gmail.com', phone:'+84 902 334 571', title:'—', company:'—', account:'MomBaby Store', owner:'Minh', leadSource:'Facebook Ads', tags:['Hot lead'], channels:['facebook','zalo'], lifecycle:'Lead', lastActivity:'10 phút trước · Facebook', score:78, city:'Hà Nội', country:'VN', createdAt:'18/04/2026', deals:1, totalValue:'5.8M₫', starred:false },
  { id:'CT-1003', first:'Linh', last:'Phạm Thị', email:'linh.p@outlook.com', phone:'+84 988 112 299', title:'Khách lẻ', company:'—', account:'Shopee · mombaby.vn', owner:'Hương', leadSource:'Shopee', tags:['Order tracking'], channels:['shopee'], lifecycle:'Customer', lastActivity:'18 phút trước · Shopee', score:65, city:'Đà Nẵng', country:'VN', createdAt:'03/02/2026', deals:2, totalValue:'1.2M₫', starred:false },
  { id:'CT-1004', first:'Ashley', last:'Fowler', email:'ashley@etsy.com', phone:'+1 415 882 4421', title:'Boutique owner', company:'Fowler & Co.', account:'Etsy · ashleyfowler', owner:'Claude Cowork', leadSource:'Etsy inbound', tags:['International'], channels:['etsy','email'], lifecycle:'Prospect', lastActivity:'47 phút trước · Etsy', score:71, city:'Toronto', country:'CA', createdAt:'05/04/2026', deals:0, totalValue:'—', starred:false },
  { id:'CT-1005', first:'Khoa', last:'Trần Minh', email:'khoa.tm@gmail.com', phone:'+84 977 445 008', title:'Reseller', company:'KhoaShop', account:'TikTok · @bamboehome', owner:'Minh', leadSource:'TikTok', tags:['Wholesale'], channels:['tiktok','zalo'], lifecycle:'Lead', lastActivity:'1h trước · TikTok', score:58, city:'TP.HCM', country:'VN', createdAt:'11/04/2026', deals:1, totalValue:'18M₫', starred:false },
  { id:'CT-1006', first:'J.', last:'Rodriguez', email:'jrod@amazon-mail.com', phone:'+1 646 228 9013', title:'Customer', company:'—', account:'Amazon · US', owner:'Hương', leadSource:'Amazon', tags:['Return'], channels:['amazon','whatsapp'], lifecycle:'Customer', lastActivity:'2h trước · Amazon', score:42, city:'New York', country:'US', createdAt:'20/03/2026', deals:1, totalValue:'$89', starred:false },
  { id:'CT-1007', first:'Li', last:'Wei', email:'liwei@yiwu-home.cn', phone:'+86 137 884 21199', title:'Sales Manager', company:'Yiwu Home Goods', account:'Yiwu Home Goods', owner:'Minh', leadSource:'1688 Sourcing', tags:['Supplier'], channels:['whatsapp','wechat'], lifecycle:'Partner', lastActivity:'3h trước · WhatsApp', score:88, city:'Yiwu', country:'CN', createdAt:'22/11/2025', deals:6, totalValue:'¥142,800', starred:true },
  { id:'CT-1008', first:'Hạnh', last:'Trần Thị', email:'hanh.tran@mombaby.vn', phone:'+84 903 552 221', title:'Founder', company:'MomBaby Vietnam', account:'MomBaby', owner:'Trâm', leadSource:'Website form', tags:['Enterprise','POC'], channels:['email','zalo'], lifecycle:'Opportunity', lastActivity:'Hôm qua · Email', score:84, city:'TP.HCM', country:'VN', createdAt:'28/03/2026', deals:1, totalValue:'120M₫', starred:true },
  { id:'CT-1009', first:'Quân', last:'Phạm Quang', email:'quan.pham@ankhang.vn', phone:'+84 912 448 773', title:'IT Director', company:'Dược phẩm An Khang', account:'An Khang Pharma', owner:'Minh', leadSource:'Outbound · Sales', tags:['Enterprise'], channels:['email'], lifecycle:'Opportunity', lastActivity:'Hôm nay · Demo booked', score:76, city:'Hà Nội', country:'VN', createdAt:'02/04/2026', deals:1, totalValue:'480M₫', starred:false },
  { id:'CT-1010', first:'Sophia', last:'Green', email:'sophia@bamboehome.com', phone:'+1 312 775 3048', title:'Buyer', company:'Green Market Co.', account:'Wholesale US', owner:'Claude Cowork', leadSource:'LinkedIn', tags:['Wholesale','International'], channels:['email','whatsapp'], lifecycle:'Lead', lastActivity:'2 ngày trước', score:51, city:'Chicago', country:'US', createdAt:'08/04/2026', deals:0, totalValue:'—', starred:false },
  { id:'CT-1011', first:'Minh Anh', last:'Đỗ Thị', email:'minhanh@gmail.com', phone:'+84 909 887 332', title:'Cá nhân', company:'—', account:'Zalo · Individual', owner:'Claude Cowork', leadSource:'Zalo ad', tags:[], channels:['zalo'], lifecycle:'Lead', lastActivity:'4 ngày trước', score:28, city:'Cần Thơ', country:'VN', createdAt:'10/04/2026', deals:0, totalValue:'—', starred:false },
  { id:'CT-1012', first:'Tuấn', last:'Lê Anh', email:'tuan.le@company.vn', phone:'+84 988 002 115', title:'Giám đốc', company:'Lê Anh Trading', account:'Lê Anh Trading', owner:'Trâm', leadSource:'Referral', tags:['VIP','Partner'], channels:['zalo','email'], lifecycle:'Partner', lastActivity:'1 tuần trước', score:90, city:'TP.HCM', country:'VN', createdAt:'05/09/2025', deals:8, totalValue:'325M₫', starred:true },
];

// Dashboard aggregated data
const DASHBOARD_STATS = {
  liveNow: { incoming:14, waitingReply:6, overdue:2, openConv:128, online:{agents:8, total:12} },
  today: [
    { k:'Hội thoại mới', v:'248', delta:'+12%', sub:'vs. hôm qua', color:'var(--primary)', icon:'chat' },
    { k:'First Response', v:'1m 42s', delta:'-23s', sub:'Target 2m', color:'var(--success)', icon:'clock' },
    { k:'Miss rate', v:'4.2%', delta:'-1.8%', sub:'Khách không được reply', color:'var(--success)', icon:'check' },
    { k:'Retention 90d', v:'62%', delta:'+5%', sub:'Quay lại sau 90 ngày', color:'#7C3AED', icon:'star' },
    { k:'Avg deal', v:'8.4M₫', delta:'+12%', sub:'Giá trị TB / khách', color:'var(--info)', icon:'out' },
    { k:'Quality score', v:'4.72', delta:'+0.08', sub:'/5 · 184 đánh giá', color:'var(--warning)', icon:'star' },
  ],
  volumeSeries: [42,58,71,62,88,102,94,118,132,128,140,108,85,64,52,68,92,118,142,156,138,112,78,46],
  channelBreakdown: [
    { name:'Zalo OA', value:842, pct:46, color:'#0068FF' },
    { name:'Facebook', value:412, pct:22, color:'#1877F2' },
    { name:'Instagram DM', value:218, pct:12, color:'#E1306C' },
    { name:'Web Chat', value:168, pct:9, color:'#2DC56A' },
    { name:'Hotline', value:104, pct:6, color:'#F59E0B' },
    { name:'Email', value:58, pct:3, color:'#64748B' },
    { name:'WhatsApp', value:40, pct:2, color:'#25D366' },
  ],
  convStatus: [
    { s:'Open', v:128, c:'#2B9EF3' },
    { s:'Pending', v:42, c:'#F59E0B' },
    { s:'On Hold', v:18, c:'#94A3B8' },
    { s:'Closed', v:324, c:'var(--primary)' },
  ],
  agents: [
    { name:'Trâm', role:'Sales Lead', conv:38, resp:'1m 12s', csat:4.9, load:82, status:'online' },
    { name:'Minh', role:'Sales', conv:32, resp:'1m 48s', csat:4.8, load:74, status:'online' },
    { name:'Hương', role:'CSKH', conv:29, resp:'2m 05s', csat:4.7, load:68, status:'busy' },
    { name:'Claude Cowork', role:'AI Bot', conv:118, resp:'4s', csat:4.6, load:54, status:'ai' },
    { name:'Hà', role:'CSKH', conv:18, resp:'2m 42s', csat:4.5, load:42, status:'away' },
  ],
  hourlyHeatmap: Array.from({length:7}, (_,d) => Array.from({length:24}, (_,h) => {
    const peak1 = Math.exp(-Math.pow((h-10)/2.4,2));
    const peak2 = Math.exp(-Math.pow((h-20)/2.2,2));
    return Math.round((peak1*0.8 + peak2*1.0 + Math.random()*0.15) * 100) / 100;
  })),
  topIntents: [
    { i:'Hỏi giá / báo giá', v:412, pct:34 },
    { i:'Đặt lịch / Booking', v:298, pct:25 },
    { i:'Dời / huỷ lịch hẹn', v:184, pct:15 },
    { i:'Chính sách / Quy trình', v:142, pct:12 },
    { i:'Tư vấn liệu trình / dịch vụ', v:98, pct:8 },
    { i:'Khác', v:66, pct:6 },
  ],
};

// Respond.io style inbox views
const INBOX_VIEWS = [
  { k:'all',        l:'All',         icon:'all',       count:248 },
  { k:'mine',       l:'Mine',        icon:'user',      count:23 },
  { k:'mentions',   l:'Mentions',    icon:'at',        count:4 },
  { k:'unassigned', l:'Unassigned',  icon:'unassign',  count:12 },
  { k:'following',  l:'Following',   icon:'eye',       count:8 },
  { k:'pending',    l:'Pending',     icon:'clock',     count:18 },
  { k:'closed',     l:'Closed',      icon:'check',     count:324 },
  { k:'spam',       l:'Spam',        icon:'ban',       count:2 },
];
const INBOX_CUSTOM_VIEWS = [
  { k:'vip',        l:'VIP khách hàng',       color:'#F59E0B', count:18 },
  { k:'overdue',    l:'Overdue > 2h',         color:'#E8553D', count:6 },
  { k:'wholesale',  l:'Wholesale leads',      color:'#2B9EF3', count:11 },
  { k:'intl',       l:'International / EN',   color:'#7C3AED', count:9 },
  { k:'refund',     l:'Refund / Return',      color:'#E11D48', count:4 },
];

// Deals pipeline (Sales module)
const DEAL_STAGES = [
  { k:'qualify',   l:'Qualification',    color:'#94A3B8', prob:15 },
  { k:'needs',     l:'Needs Analysis',   color:'#2B9EF3', prob:30 },
  { k:'proposal',  l:'Proposal',         color:'#8B5CF6', prob:55 },
  { k:'negotiate', l:'Negotiation',      color:'#F59E0B', prob:75 },
  { k:'won',       l:'Closed Won',       color:'#2DC56A', prob:100 },
  { k:'lost',      l:'Closed Lost',      color:'#E33F3F', prob:0 },
];
const DEALS = [
  { id:'D-2041', name:'Shop Bé Na · Gói Pro 1 năm',     amount:18_000_000,  stage:'negotiate', contact:'Lan Nguyễn',   account:'Shop Bé Na',     owner:'Trâm',  close:'25/04/2026', source:'Zalo OA', prob:75, age:'12 ngày', health:'hot', aiNote:'Khách hỏi về thanh toán trả góp — gửi báo giá phiên bản Pro-Annual.' },
  { id:'D-2042', name:'MomBaby · Gói Team 5 agents',    amount:36_000_000,  stage:'proposal',  contact:'Hạnh Trần',    account:'MomBaby',        owner:'Trâm',  close:'30/04/2026', source:'Website', prob:55, age:'18 ngày', health:'warm', aiNote:'Đã demo xong · chờ duyệt nội bộ bên khách.' },
  { id:'D-2043', name:'An Khang Pharma · Enterprise',   amount:120_000_000, stage:'needs',     contact:'Quân Phạm',    account:'An Khang Pharma',owner:'Minh',  close:'15/05/2026', source:'Referral',prob:30, age:'6 ngày',  health:'hot', aiNote:'Cần đề xuất SSO + audit log + DPIA.' },
  { id:'D-2044', name:'Yiwu Home Goods · B2B Sourcing', amount:45_000_000,  stage:'qualify',   contact:'Li Wei',       account:'Yiwu Home Goods',owner:'Minh',  close:'22/05/2026', source:'Sourcing',prob:15, age:'3 ngày',  health:'warm', aiNote:'Mới liên hệ qua Sourcing Agent · cần call làm rõ MOQ.' },
  { id:'D-2045', name:'KhoaShop · Upgrade Starter→Pro', amount:6_500_000,   stage:'negotiate', contact:'Khoa Trần',    account:'KhoaShop',       owner:'Minh',  close:'24/04/2026', source:'TikTok',  prob:75, age:'5 ngày',  health:'hot', aiNote:'Khách đồng ý 80% · đang xin discount 10%.' },
  { id:'D-2046', name:'Fowler & Co. · Wholesale Pilot', amount:28_000_000,  stage:'proposal',  contact:'Ashley Fowler',account:'Fowler & Co.',   owner:'Claude Cowork',close:'02/05/2026', source:'Etsy',   prob:55, age:'9 ngày',  health:'warm', aiNote:'Gửi sample tuần này · chờ feedback.' },
  { id:'D-2047', name:'Dr. Nguyễn Clinic · Starter',    amount:3_500_000,   stage:'won',       contact:'Dr. Nguyễn',   account:'Clinic Saigon',  owner:'Hương', close:'19/04/2026', source:'Facebook',prob:100,age:'21 ngày', health:'hot', aiNote:'Đã ký HĐ · onboarding 21/04.' },
  { id:'D-2048', name:'Lê Anh Trading · Pro 6 tháng',   amount:9_000_000,   stage:'won',       contact:'Tuấn Lê',      account:'Lê Anh Trading', owner:'Trâm',  close:'17/04/2026', source:'Zalo OA', prob:100,age:'14 ngày', health:'hot', aiNote:'Đã thanh toán · chuyển sang onboarding.' },
  { id:'D-2049', name:'Green Market · US Wholesale',    amount:52_000_000,  stage:'qualify',   contact:'Sophia Green', account:'Green Market Co.',owner:'Claude Cowork',close:'10/05/2026', source:'Amazon',  prob:15, age:'2 ngày',  health:'cold', aiNote:'Lead vừa tạo · chưa có reply.' },
  { id:'D-2050', name:'BambooHome · Dropship Pack',     amount:4_200_000,   stage:'lost',      contact:'J. Rodriguez', account:'Amazon Retail',  owner:'Hương', close:'15/04/2026', source:'Amazon',  prob:0,  age:'28 ngày', health:'cold', aiNote:'Khách chọn đối thủ (giá rẻ hơn 22%).' },
  { id:'D-2051', name:'Minh Anh · Cá nhân Starter',     amount:990_000,     stage:'needs',     contact:'Minh Anh Đỗ',  account:'Cá nhân',        owner:'Claude Cowork',close:'27/04/2026', source:'Zalo',    prob:30, age:'4 ngày',  health:'warm', aiNote:'Đang dùng trial 14 ngày · kích hoạt ngày 8.' },
  { id:'D-2052', name:'Linh Phạm · Shopee Plus',        amount:2_400_000,   stage:'proposal',  contact:'Linh Phạm',    account:'Shopee mombaby', owner:'Hương', close:'28/04/2026', source:'Shopee',  prob:55, age:'7 ngày',  health:'warm', aiNote:'Đã gửi báo giá · follow-up 22/04.' },
];

// Template library (for Broadcast)
const TEMPLATES = [
  { id:'T-001', name:'Flash Sale ZNS', channel:'zns',      cat:'Khuyến mãi',  status:'approved', usage:48, updated:'2 ngày trước', blocks:[
      { t:'header', text:'🎉 FLASH SALE 20/04' },
      { t:'text',   text:'Chị Lan ơi, ưu đãi độc quyền dành cho khách VIP — giảm đến 30% toàn bộ BST Xuân Hè 2026. Chỉ trong 48h!' },
      { t:'image',  alt:'Banner Flash Sale' },
      { t:'button', text:'Mua ngay', url:'https://shop.vn/flash' },
    ]
  },
  { id:'T-002', name:'Welcome chào mừng khách mới', channel:'zalo', cat:'Onboarding', status:'approved', usage:128, updated:'1 tuần trước', blocks:[
      { t:'header', text:'Chào mừng đến AppChat 👋' },
      { t:'text',   text:'Cảm ơn bạn đã đăng ký! Hãy khám phá 3 tính năng chính để bắt đầu.' },
      { t:'button', text:'Bắt đầu tour', url:'https://app.appchat.vn/tour' },
    ]
  },
  { id:'T-003', name:'Cart abandonment · Email', channel:'email', cat:'Re-engage', status:'approved', usage:34, updated:'5 ngày trước', blocks:[
      { t:'header', text:'Giỏ hàng đang đợi bạn 🛒' },
      { t:'image',  alt:'Sản phẩm trong giỏ' },
      { t:'text',   text:'Chúng tôi giữ giỏ hàng của bạn trong 24h. Hoàn tất đơn hàng ngay để nhận ưu đãi miễn phí vận chuyển.' },
      { t:'button', text:'Tiếp tục thanh toán', url:'#' },
    ]
  },
  { id:'T-004', name:'Sinh nhật khách hàng', channel:'zns', cat:'Cá nhân hoá', status:'pending', usage:0, updated:'Hôm nay', blocks:[
      { t:'header', text:'🎂 Chúc mừng sinh nhật!' },
      { t:'text',   text:'{{firstName}} ơi, AppChat gửi tặng bạn mã giảm 20% cho đơn hàng kế tiếp. Chúc bạn một ngày tuyệt vời!' },
      { t:'button', text:'Dùng ngay', url:'#' },
    ]
  },
  { id:'T-005', name:'Xác nhận đơn hàng SMS',  channel:'sms',   cat:'Transactional', status:'approved', usage:2140, updated:'3 tuần trước', blocks:[
      { t:'text',   text:'AppChat: Đơn hàng #{{orderId}} đã được xác nhận. Dự kiến giao 24h tới. Tra cứu: {{link}}' },
    ]
  },
  { id:'T-006', name:'Báo giá doanh nghiệp Email', channel:'email', cat:'Sales',   status:'draft',    usage:0,    updated:'Hôm nay',   blocks:[
      { t:'header', text:'Báo giá dành cho {{company}}' },
      { t:'text',   text:'Kính gửi anh/chị {{contactName}}, sau đây là đề xuất giải pháp AppChat Ultimate cho team 10+ người.' },
      { t:'image',  alt:'Bảng tính năng' },
      { t:'button', text:'Tải báo giá PDF', url:'#' },
    ]
  },
];

window.AppData = {
  CONVERSATIONS, ACTIVE_THREAD,
  SUPPLIERS, SOURCING_RESULTS,
  TICKETS, SCHEDULES, CALL_LOGS,
  TASKS, MEETINGS,
  CAMPAIGNS, WORKFLOWS, AI_AGENTS,
  FILES, KPI, TEAM, CHANNELS_CONNECTED,
  CONTACTS, DASHBOARD_STATS,
  INBOX_VIEWS, INBOX_CUSTOM_VIEWS,
  DEALS, DEAL_STAGES, TEMPLATES,
  helpers: { initials, avatarBgFromName },
};
