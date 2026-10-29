# Dữ liệu mục Cài đặt › SLA + Thông báo (prototype L7375–7419, L6200–6216; state L7832–7848, renderVals L10122–10345) cho gen-settings.py.
# Chỉnh theo quyết định: SLA chỉ có chính sách mặc định ở P0 (Blueprint §7.2 "org_sla — chỉ chính sách mặc định"; sla_policy.is_default
# không xoá được) — các dòng còn lại là kênh / chiến dịch OUT (Gọi điện, ZNS, Workflow) nên bỏ; thông báo bỏ "Workflow chạy lỗi" (OUT).

SLA = {
    "policy": {"name": "Mặc định", "scope": "all", "tier": "all", "color": "#2563EB", "on": True,
               "frt_ai": 0, "frt_human": 10, "ttr_ai": 30, "ttr_human": 240},
    "tz": "GMT+7 · Hà Nội",
    "days": [
        {"day": 0, "on": True, "from": "08:00", "to": "18:00"},
        {"day": 1, "on": True, "from": "08:00", "to": "18:00"},
        {"day": 2, "on": True, "from": "08:00", "to": "18:00"},
        {"day": 3, "on": True, "from": "08:00", "to": "18:00"},
        {"day": 4, "on": True, "from": "08:00", "to": "18:00"},
        {"day": 5, "on": True, "from": "08:00", "to": "12:00"},
        {"day": 6, "on": False, "from": "08:00", "to": "18:00"},
    ],
    "pause_sla": True,
    "escalation": [
        {"key": "warn_80", "color": "#F59E0B", "on": True},
        {"key": "frt_breach", "color": "#DC2626", "on": True},
        {"key": "ttr_breach", "color": "#DC2626", "on": True},
        {"key": "ai_low", "color": "#6E48E6", "on": True},
        {"key": "vip_wait", "color": "#2563EB", "on": False},
    ],
    "risk": {"at_risk": 8, "ai": 5, "human": 3},
}

NOTIF = {
    "groups": [
        {"key": "msg", "events": [["msg_assigned", 1, 1, 1], ["msg_mention", 1, 1, 1], ["msg_vip", 1, 1, 1], ["sla_warn", 1, 0, 1]]},
        {"key": "ai", "events": [["ai_review", 1, 0, 0], ["ai_escalate", 1, 1, 1], ["ai_budget", 0, 1, 0]]},
        {"key": "system", "events": [["channel_down", 1, 1, 1], ["billing_invoice", 0, 1, 0]]},
    ],
    "dnd": {"on": False, "from": "22:00", "to": "08:00"},
    "sound": True,
    "digest": "daily",
}


def build_ops():
    return {
        "sla": SLA,
        "notif": {
            **{k: v for k, v in NOTIF.items() if k != "groups"},
            "groups": [
                {"key": g["key"], "events": [{"key": k, "desktop": bool(d), "email": bool(e), "mobile": bool(m)} for k, d, e, m in g["events"]]}
                for g in NOTIF["groups"]
            ],
        },
    }
