# Dữ liệu mục Cài đặt › AI (prototype L6878–7043, state L7709–7849, renderVals L10331–10535) cho gen-settings.py.
# Chỉnh theo quyết định: mức AI tiêu chuẩn / nâng cao / tối đa thay tên model (D29); bỏ "Tự chuyển model rẻ khi hết hạn mức";
# nhật ký AI ghi "Trợ lý AI" thay tên model; giá mức AI tính bằng credit (Blueprint §2 model_price).

AI = {
    "default_tier": "standard",
    "tiers": [
        {"key": "standard", "credits": "1", "badge": "using", "active": True, "locked": False},
        {"key": "advanced", "credits": "4", "badge": "hot", "active": True, "locked": False},
        {"key": "max", "credits": "15", "badge": "", "active": False, "locked": True},
    ],
    "tasks": [
        {"key": "copilot", "tier": "standard"},
        {"key": "auto_reply", "tier": "standard"},
        {"key": "order_analysis", "tier": "advanced"},
        {"key": "insights", "tier": "advanced"},
        {"key": "content", "tier": "standard"},
    ],
    "budget": 5000000,
    "rate_limit": 10000,
}

KB_TYPES = {
    "pdf": ["PDF", "#E0566A", "#FCEBEE"], "xls": ["XLS", "#1B9E5A", "#EAF7EF"], "doc": ["DOC", "#2563EB", "#EAF1FC"],
    "folder": ["", "#C9820B", "#FBF3E2"], "mp4": ["MP4", "#FFFFFF", "#231F20"], "md": ["MD", "#0E9B94", "#E6F6F4"],
    "ppt": ["PPT", "#E8602C", "#FCEEE6"],
}
KB_DOCS = [
    ["Catalogue BST Hè 2026.pdf", "pdf", ["Catalogue", "Hè 2026"], True, "12.4 MB", "upload", "Trâm", "2026-04-18", "f_cat"],
    ["Bảng giá sỉ — Dropship Q2.xlsx", "xls", ["Giá sỉ"], True, "840 KB", "upload", "Minh", "2026-04-17", "f_price"],
    ["Chính sách đổi trả 2026.docx", "doc", ["Policy"], True, "124 KB", "upload", "Hương", "2026-04-15", "f_policy"],
    ["Ảnh sản phẩm — Shoot April", "folder", ["Ảnh"], False, "312 files", "drive", "Trâm", "2026-04-14", "f_img"],
    ["Video hướng dẫn mặc váy hoa.mp4", "mp4", ["Video", "Tutorial"], True, "48.2 MB", "conv", "AI (from Zalo)", "2026-04-12", None],
    ["Hợp đồng Gia Dụng Sài Gòn.pdf", "pdf", ["Contract", "Vận hành"], False, "2.1 MB", "conv", "Minh", "2026-04-10", "f_policy"],
    ["FAQ — Quy trình đơn hàng.md", "md", ["FAQ", "Vận hành"], True, "18 KB", "internal", "Huyền", "2026-04-08", None],
    ["Báo cáo KPI tháng 3.pptx", "ppt", ["Report"], False, "6.8 MB", "upload", "CMO", "2026-04-05", "f_report"],
]
KB_FOLDERS = [["f_cat", "Catalogues"], ["f_price", "Bảng giá"], ["f_policy", "Policy & Contracts"], ["f_img", "Ảnh sản phẩm"], ["f_report", "Reports"]]
KB_NAV = {"all": 412, "learned": 284, "conv": 186, "upload": 128, "star": 24, "trash": 8}

GOV = {
    "scopes": [["messages", True, False], ["catalog", True, False], ["faq", True, False], ["pii", False, True], ["finance", False, True], ["partner", False, False]],
    "bounds": [["auto_close", False, True], ["send_bank", False, True], ["discount", False, True], ["promise_delivery", False, False],
               ["escalate", True, False], ["disclosure", True, False], ["log_all", True, False]],
    "keywords": ["chính trị", "tôn giáo", "cạnh tranh tiêu cực", "đầu tư tài chính", "y tế cá nhân", "pháp lý cá nhân"],
    "filter": "strict", "long_review": False, "retention": "90", "no_external_train": True, "anonymize_pii": True, "residency": "sg",
    "applied": 12, "total": 14,
}

AUDIT = [
    ["14:32", "Lan", "owner", "Cập nhật quy tắc phân công \"Chào Zalo\"", "118.70.12.45"],
    ["14:18", "Trâm", "manager", "Mời user hoang@mediasoft.vn", "118.70.12.44"],
    ["13:55", None, "system", "Gia hạn khoá kết nối SePay", None],
    ["13:22", "Minh", "sales", "Xuất CSV 240 khách hàng", "14.241.55.87"],
    ["12:40", None, "ai", "Chuyển hội thoại #8230 → Lan", None],
    ["12:15", "Lan", "owner", "Đổi vai trò Nhân viên kinh doanh", "118.70.12.45"],
    ["11:50", "Trâm", "manager", "Kết nối kênh Email", "118.70.12.44"],
]
AI_AUDIT = [
    ["14:23:10", "copilot", "Gợi ý trả lời", "Hộp thư / Hội thoại #8245", "ok"],
    ["14:22:48", "ops", "Đồng bộ dữ liệu đơn", "Đồng bộ 500 đơn", "ok"],
    ["14:21:02", "copilot", "Bị chặn (từ khoá cấm)", "Chủ đề tài chính cá nhân", "warn"],
    ["14:19:36", "order", "Tự chốt đơn 850.000₫", "Đơn #VN-8842", "ok"],
    ["14:15:21", "cs", "Chuyển người — độ tin cậy 62%", "Khách khiếu nại hoàn tiền", "escalated"],
    ["14:12:04", "human", "Điều chỉnh hướng dẫn agent", "Sales Zalo · phiên bản 12", "ok"],
    ["14:10:18", "copilot", "Ẩn PII trong nhật ký", "Hội thoại #8240 — ẩn SĐT", "ok"],
]


def build_ai():
    return {
        "ai": AI,
        "kb": {
            "types": KB_TYPES,
            "folders": [{"id": i, "name": n} for i, n in KB_FOLDERS],
            "nav": KB_NAV,
            "learned_total": 284,
            "size": "4.2 GB",
            "docs": [
                {"id": f"kb_{k + 1}", "name": n, "type": t, "tags": tg, "learned": le, "size": sz, "source": src, "by": by, "date": d,
                 "folder_id": fo, "starred": False}
                for k, (n, t, tg, le, sz, src, by, d, fo) in enumerate(KB_DOCS)
            ],
        },
        "governance": {
            **{k: v for k, v in GOV.items() if k not in ("scopes", "bounds")},
            "scopes": [{"key": k, "on": on, "sensitive": w} for k, on, w in GOV["scopes"]],
            "bounds": [{"key": k, "on": on, "risky": w} for k, on, w in GOV["bounds"]],
        },
        "audit": [{"time": t, "name": n, "role": r, "action": a, "ip": ip} for t, n, r, a, ip in AUDIT],
        "ai_audit": [{"time": t, "actor": u, "action": a, "context": c, "status": s} for t, u, a, c, s in AI_AUDIT],
    }
