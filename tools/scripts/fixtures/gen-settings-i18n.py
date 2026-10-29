# Sinh messages/{vi,en}/settings.json (khung Cài đặt, Tổng quan, Ngôn ngữ, Thành viên, Vai trò). Gộp vào file hiện có — chạy lại an toàn.
import json, os

BASE = 'D:/CODING/AppChat_Ver2/apps/web/messages'

NAV = {
    'general': ('Tổng quan', 'Overview'), 'locale': ('Ngôn ngữ & vùng', 'Language & region'),
    'members': ('Thành viên', 'Members'), 'roles': ('Vai trò & phân quyền', 'Roles & permissions'),
    'org_sla': ('Thiết lập SLA', 'SLA settings'), 'channels': ('Kênh kết nối', 'Channels'),
    'web_widget': ('Trợ lý AI website', 'Website AI widget'), 'integrations': ('Nền tảng kết nối', 'Integrations'),
    'contacts_fields': ('Trường dữ liệu (Custom Fields)', 'Custom fields'), 'tags': ('Thẻ & nhãn', 'Tags & labels'),
    'replies': ('Câu trả lời mẫu', 'Canned replies'), 'doc_templates': ('Mẫu chứng từ', 'Document templates'),
    'ai_models': ('AI Models', 'AI models'), 'rag_data': ('Dữ liệu RAG · Knowledge Base', 'RAG data · Knowledge base'),
    'ai_gov': ('AI Governance', 'AI governance'), 'ai_audit': ('AI Audit log', 'AI audit log'),
    'audit': ('Audit log', 'Audit log'), 'notifications': ('Thông báo', 'Notifications'),
    'billing': ('Gói & thanh toán', 'Plan & billing'), 'wallet': ('Ví AppChat', 'AppChat wallet'),
    'profile': ('Hồ sơ của tôi', 'My profile'),
}
HEAD = dict(NAV)
HEAD.update({'web_widget': ('Trợ lý AI', 'AI assistant'), 'integrations': ('Tích hợp', 'Integrations')})

ROLE = {'owner': ('Chủ sở hữu', 'Owner'), 'manager': ('Quản lý', 'Manager'), 'sales': ('Nhân viên kinh doanh', 'Sales'),
        'cs': ('Chăm sóc khách hàng', 'Customer care'), 'accountant': ('Kế toán', 'Accountant')}

PERMS = {
    'assistant.use': ('Dùng Trợ lý AI (Co-pilot)', 'Use AI assistant (co-pilot)'),
    'ai_task.manage': ('Giao việc AI định kỳ', 'Manage recurring AI tasks'),
    'approvals.decide': ('Duyệt việc AI chờ duyệt', 'Decide AI approvals'),
    'inbox.view': ('Xem hộp thư', 'View inbox'), 'inbox.reply': ('Gửi tin nhắn', 'Send messages'),
    'inbox.assign': ('Gán / phân hội thoại', 'Assign conversations'), 'inbox.manage': ('Thẻ & câu trả lời mẫu', 'Tags & canned replies'),
    'inbox.export': ('Xuất dữ liệu hội thoại', 'Export conversations'),
    'crm.view': ('Xem liên hệ', 'View contacts'), 'crm.edit': ('Tạo / sửa liên hệ', 'Create / edit contacts'),
    'crm.delete': ('Xoá liên hệ', 'Delete contacts'), 'crm.import': ('Nhập danh sách khách', 'Import contacts'),
    'crm.export': ('Xuất danh sách khách', 'Export contacts'), 'crm.reassign': ('Chuyển người phụ trách', 'Reassign owner'),
    'crm.fields_manage': ('Quản lý trường dữ liệu', 'Manage custom fields'),
    'catalog.view': ('Xem sản phẩm & dịch vụ', 'View catalog'), 'catalog.manage': ('Quản lý sản phẩm', 'Manage catalog'),
    'catalog.cost_view': ('Xem giá vốn', 'View cost price'), 'quote.create': ('Tạo / gửi báo giá', 'Create / send quotes'),
    'quote.approve': ('Duyệt báo giá vượt ngưỡng', 'Approve quotes over threshold'), 'contract.draft': ('Soạn hợp đồng', 'Draft contracts'),
    'contract.sign': ('Ký hợp đồng', 'Sign contracts'), 'order.manage': ('Tạo / xử lý đơn hàng', 'Create / process orders'),
    'order.cancel': ('Huỷ đơn hàng', 'Cancel orders'),
    'invoice.manage': ('Đề nghị thanh toán', 'Payment requests'), 'payment.record': ('Ghi nhận thanh toán', 'Record payments'),
    'payment.refund_request': ('Đề xuất hoàn tiền', 'Request refunds'), 'payment.refund_approve': ('Duyệt hoàn tiền', 'Approve refunds'),
    'finance.manage': ('Cấu hình tài chính', 'Finance settings'),
    'booking.view': ('Xem lịch hẹn', 'View appointments'), 'booking.manage': ('Tạo / sửa lịch hẹn', 'Create / edit appointments'),
    'booking.config': ('Cấu hình dịch vụ & lịch', 'Booking settings'),
    'ticket.view': ('Xem ticket', 'View tickets'), 'ticket.manage': ('Xử lý / đóng ticket', 'Handle / close tickets'),
    'sla.manage': ('Cấu hình SLA', 'Configure SLA'),
    'campaign.view': ('Xem chiến dịch', 'View campaigns'), 'campaign.manage': ('Tạo / gửi chiến dịch', 'Create / send campaigns'),
    'campaign.approve': ('Duyệt chiến dịch', 'Approve campaigns'), 'loyalty.view': ('Xem khách thân thiết', 'View loyalty'),
    'loyalty.adjust': ('Điều chỉnh điểm', 'Adjust points'), 'loyalty.config': ('Cấu hình hạng & điểm', 'Loyalty settings'),
    'agents.manage': ('Tạo / sửa AI Agent', 'Create / edit AI agents'), 'kb.manage': ('Quản lý kho tri thức', 'Manage knowledge base'),
    'ai.governance': ('AI Governance & mức AI', 'AI governance & tiers'),
    'settings.manage': ('Cài đặt workspace', 'Workspace settings'), 'members.manage': ('Mời / quản lý thành viên', 'Invite / manage members'),
    'channels.manage': ('Kết nối kênh', 'Connect channels'), 'integrations.manage': ('Nền tảng kết nối', 'Integrations'),
    'audit.view': ('Nhật ký hệ thống (Audit log)', 'Audit log'), 'roles.manage': ('Vai trò & phân quyền', 'Roles & permissions'),
    'billing.manage': ('Gói, ví & thanh toán', 'Plan, wallet & billing'), 'privacy.erase': ('Xoá dữ liệu cá nhân', 'Erase personal data'),
}

GROUP_PERM = {'assistant': ('Trợ lý AI', 'AI assistant'), 'inbox': ('Hộp thư', 'Inbox'), 'crm': ('Khách hàng & CRM', 'Customers & CRM'),
              'sales': ('Bán hàng', 'Sales'), 'finance': ('Thu tiền', 'Payments'), 'booking': ('Lịch hẹn', 'Appointments'),
              'support': ('Hỗ trợ (Tickets)', 'Support (tickets)'), 'marketing': ('Marketing & khách thân thiết', 'Marketing & loyalty'),
              'ai': ('AI Agents', 'AI agents'), 'admin': ('Cài đặt & quản trị', 'Settings & admin')}


def pair(d):
    return {k: v[0] for k, v in d.items()}, {k: v[1] for k, v in d.items()}


def build(i):
    L = lambda vi, en: (vi, en)[i]
    nav = {k: v[i] for k, v in NAV.items()}
    return {
        'title': L('Settings', 'Settings'),
        'sub': L('Quản trị workspace · AI · Bảo mật · Thanh toán', 'Workspace · AI · Security · Billing'),
        'search': L('Tìm cài đặt… (⌘K)', 'Search settings… (⌘K)'),
        'docs': L('Tài liệu', 'Docs'),
        'docsSoon': L('Tài liệu hướng dẫn đang được cập nhật', 'Documentation is being updated'),
        'group': {k: v[i] for k, v in {'workspace': ('WORKSPACE', 'WORKSPACE'), 'users': ('NGƯỜI DÙNG', 'USERS'),
                                      'ops': ('TỔ CHỨC & VẬN HÀNH', 'OPERATIONS'), 'apps': ('ỨNG DỤNG', 'APPS'), 'ai': ('AI', 'AI'),
                                      'security': ('BẢO MẬT', 'SECURITY'), 'finance': ('THÔNG BÁO & TÀI CHÍNH', 'NOTIFICATIONS & BILLING')}.items()},
        'nav': nav,
        'head': {k: v[i] for k, v in HEAD.items()},
        'headSub': {
            'roles': L('Định nghĩa nhóm quyền và gán cho thành viên', 'Permission sets assigned to members'),
            'org_sla': L('Cam kết theo kênh · hạng khách · loại yêu cầu — tách riêng AI và con người',
                         'Commitments by channel · tier · request type — AI and humans tracked separately'),
        },
        'roleName': {k: v[i] for k, v in ROLE.items()},
        'general': {
            'mine': L('Workspace của bạn', 'Your workspaces'),
            'mineD': L('1 tài khoản có thể có nhiều workspace · chuyển nhanh giữa các workspace', 'One account can own several workspaces · switch quickly'),
            'buy': L('Mua thêm workspace', 'Buy workspace'), 'buySoon': L('Liên hệ AppChat để mở thêm workspace', 'Contact AppChat to add a workspace'),
            'seats': L('{n} seats', '{n} seats'), 'current': L('Đang dùng', 'Current'), 'switch': L('Chuyển vào', 'Switch'),
            'switched': L('Đã chuyển sang {n}', 'Switched to {n}'),
            'wsId': L('workspace.id ·', 'workspace.id ·'), 'logo': L('Đổi logo', 'Change logo'), 'logoSoon': L('Tải logo PNG / SVG ≤ 1MB', 'Upload a PNG / SVG logo ≤ 1MB'),
            'info': L('Thông tin chung', 'General information'),
            'infoD': L('Thông tin này sẽ xuất hiện trên hoá đơn và báo cáo', 'Shown on invoices and reports'),
            'f': {k: v[i] for k, v in {'legal_name': ('Tên công ty', 'Company name'), 'website': ('Website', 'Website'),
                                       'tax_code': ('Mã số thuế', 'Tax code'), 'address': ('Địa chỉ đăng ký', 'Registered address'),
                                       'support_phone': ('Số điện thoại hỗ trợ', 'Support phone'), 'admin_email': ('Email quản trị', 'Admin email')}.items()},
            'h': {k: v[i] for k, v in {'legal_name': ('Dùng trên hoá đơn và email xuất đi', 'Used on invoices and outgoing email'),
                                       'website': ('Link chính thức của công ty', 'Official company link'),
                                       'tax_code': ('Hiển thị trên hoá đơn VAT', 'Shown on VAT invoices')}.items()},
            'cancel': L('Huỷ', 'Cancel'), 'save': L('Lưu thay đổi', 'Save changes'),
            'danger': L('Vùng nguy hiểm', 'Danger zone'), 'dangerD': L('Các thao tác không thể hoàn tác', 'These actions cannot be undone'),
            'dz': {
                'freeze': L('Đóng băng workspace', 'Freeze workspace'), 'freezeD': L('Tạm dừng toàn bộ hoạt động, không mất dữ liệu', 'Pause all activity, keep all data'),
                'freezeBtn': L('Đóng băng', 'Freeze'),
                'export': L('Xuất toàn bộ dữ liệu', 'Export all data'), 'exportD': L('File ZIP chứa tất cả hội thoại, contacts, log AI', 'ZIP with all conversations, contacts and AI logs'),
                'exportBtn': L('Xuất dữ liệu', 'Export data'),
                'delete': L('Xoá workspace', 'Delete workspace'),
                'deleteD': L('Hành động này không thể hoàn tác. Toàn bộ dữ liệu sẽ bị xoá sau 30 ngày.', 'This cannot be undone. All data is deleted after 30 days.'),
                'deleteBtn': L('Xoá workspace', 'Delete workspace'),
                'requested': L('Đã gửi yêu cầu — AppChat sẽ xác nhận qua email quản trị', 'Request sent — AppChat will confirm via the admin email'),
            },
        },
        'locale': {
            'lang': L('Ngôn ngữ giao diện', 'Interface language'), 'langs': {'vi': 'Tiếng Việt', 'en': 'English'},
            'tz': L('Múi giờ', 'Time zone'), 'zones': {'hcm': '(GMT+7) Asia/Ho_Chi_Minh', 'utc': '(GMT+0) UTC'},
            'date': L('Định dạng ngày', 'Date format'), 'currency': L('Tiền tệ', 'Currency'), 'vnd': 'VND (₫)',
        },
        'members': {
            'search': L('Tìm thành viên, email, phòng', 'Search members, email, team'),
            'filter': L('Lọc', 'Filter'), 'filterSoon': L('Lọc theo vai trò / trạng thái', 'Filter by role / status'),
            'export': L('Xuất CSV', 'Export CSV'), 'exported': L('Đã xuất danh sách thành viên', 'Member list exported'),
            'invite': L('Mời thành viên', 'Invite member'),
            'aiT': L('AI đề xuất: 3 thành viên chưa đăng nhập hơn 30 ngày', 'AI suggests: 3 members have not signed in for 30+ days'),
            'aiS': L('Cân nhắc gỡ seat để tiết kiệm 1.500.000đ/tháng', 'Consider removing seats to save 1,500,000đ/month'),
            'aiBtn': L('Xem chi tiết', 'View details'),
            'col': {k: v[i] for k, v in {'member': ('Thành viên', 'Member'), 'role': ('Vai trò', 'Role'), 'dept': ('Phòng ban', 'Team'),
                                         'last': ('Hoạt động cuối', 'Last active'), 'status': ('Trạng thái', 'Status')}.items()},
            'last': {k: v[i] for k, v in {'online': ('Đang online', 'Online'), '2h': ('2h trước', '2h ago'), '3d': ('3 ngày trước', '3 days ago'),
                                          'never': ('Chưa đăng nhập', 'Never')}.items()},
            'status': {k: v[i] for k, v in {'active': ('Active', 'Active'), 'offline': ('Offline', 'Offline'), 'pending': ('Chờ xác nhận', 'Pending')}.items()},
            'menu': L('Thao tác', 'Actions'), 'edit': L('Sửa thông tin', 'Edit'), 'remove': L('Xoá thành viên', 'Remove member'),
            'revoke': L('Thu hồi lời mời', 'Revoke invite'),
            'foot': L('{n} thành viên · Gói của bạn hỗ trợ tối đa <b>{max} seat</b>', '{n} members · Your plan supports up to <b>{max} seats</b>'),
            'upgrade': L('Nâng cấp plan', 'Upgrade plan'),
            'modal': {
                'title': L('Mời thành viên', 'Invite member'), 'editTitle': L('Sửa thành viên', 'Edit member'),
                'name': L('Họ tên', 'Full name'), 'namePh': L('Nguyễn Văn A', 'Jane Doe'), 'email': 'Email', 'emailPh': 'email@appchat.vn',
                'role': L('Vai trò', 'Role'), 'send': L('Gửi lời mời', 'Send invite'), 'save': L('Lưu', 'Save'),
                'cancel': L('Huỷ', 'Cancel'), 'close': L('Đóng', 'Close'), 'errEmail': L('Email không hợp lệ', 'Invalid email'),
                'roleD': {
                    'manager': L('Toàn quyền vận hành, trừ ký hợp đồng, hoàn tiền, billing (trừ khi được uỷ quyền)', 'Full operations except signing, refunds and billing (unless delegated)'),
                    'sales': L('Chỉ thấy khách, báo giá, đơn của mình', 'Sees only own customers, quotes and orders'),
                    'cs': L('Hội thoại, lịch hẹn, ticket được giao; không xem doanh số', 'Assigned conversations, appointments, tickets; no sales data'),
                    'accountant': L('Đơn, thu tiền, đối soát, điểm; không vào hộp thư', 'Orders, payments, reconciliation, points; no inbox'),
                },
            },
        },
        'roles': {
            'onlyOne': L('chỉ có 1', 'only one'), 'people': L('{n} người', '{n} people'), 'system': L('Hệ thống', 'System'),
            'p1': L('Tạo / sửa vai trò tuỳ biến sẽ có ở bản sau (P1)', 'Custom roles arrive in a later release (P1)'),
            'desc': {
                'owner': L('Toàn quyền · ký hợp đồng, duyệt hoàn tiền, gói & thanh toán', 'Everything · signs contracts, approves refunds, billing'),
                'manager': L('Quản lý vận hành và đội ngũ, xem toàn bộ dữ liệu', 'Runs operations and the team, sees all data'),
                'sales': L('Tư vấn, báo giá, chốt đơn — dữ liệu của mình', 'Advises, quotes, closes — own data'),
                'cs': L('Chăm sóc khách hàng, lịch hẹn, ticket — không xem doanh số', 'Customer care, appointments, tickets — no sales'),
                'accountant': L('Đơn hàng, thu tiền, đối soát, điều chỉnh điểm', 'Orders, payments, reconciliation, points'),
            },
            'matrix': L('Ma trận phân quyền', 'Permission matrix'), 'matrixD': L('So sánh chi tiết quyền của từng vai trò', 'Compare each role in detail'),
            'perm': L('QUYỀN', 'PERMISSION'),
            'group': {k: v[i] for k, v in GROUP_PERM.items()},
            'perms': {k.replace('.', '_'): v[i] for k, v in PERMS.items()},
        },
    }


def merge(a, b):
    for k, v in b.items():
        if isinstance(v, dict) and isinstance(a.get(k), dict):
            merge(a[k], v)
        else:
            a[k] = v
    return a


for i, loc in enumerate(['vi', 'en']):
    p = f'{BASE}/{loc}/settings.json'
    cur = json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}
    merge(cur, build(i))
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(cur, f, ensure_ascii=False, indent=2)
        f.write('\n')
