# Sinh fixtures/prototype-parity/products.json từ prototype L5624–5753 (màn Sản phẩm) + state.products L7780 + pdItems L9524.
# Ngoại lệ (prototype-parity §6, D28 / D31): nguồn đồng bộ chỉ connector có manifest; sàn / POS là "Sắp có";
# Zalo OA / Facebook (không có manifest) → Zalo cá nhân / Web chat; "ZNS" (OUT) → Zalo.
import json

RAW = [
    ["HIFU nâng cơ 8 buổi", "Liệu trình", "12800000", 68, "active", ["zalo_personal", "webchat", "shopee"], "Liệu trình cao cấp · 8 tuần"],
    ["Combo chăm sóc da mặt", "Combo", "9500000", 124, "active", ["zalo_personal", "webchat", "tiktok_shop"], "5 bước · phục hồi & dưỡng"],
    ["Triệt lông toàn thân", "Gói năm", "22000000", 41, "active", ["webchat", "kiotviet"], "Gói năm · không giới hạn"],
    ["Khám da soi VISIA", "Dịch vụ lẻ", "500000", 312, "active", ["zalo_personal", "webchat"], "Soi da chuyên sâu"],
    ["Serum phục hồi B5", "Sản phẩm", "680000", 205, "active", ["shopee", "tiktok_shop", "webchat"], "Chai 30ml · chính hãng"],
    ["Mặt nạ collagen (hộp 10)", "Sản phẩm", "450000", 0, "draft", ["kiotviet"], "Đang đồng bộ kho"],
]
# Danh mục prototype → loại sản phẩm (COMMERCE §2: physical · service · combo · package · digital · rental)
TYPE = {"Liệu trình": "package", "Combo": "combo", "Gói năm": "package", "Dịch vụ lẻ": "service", "Sản phẩm": "physical"}
UNIT = ["Gói", "Buổi", "Combo", "Cái", "Lần"]
ATTRS = {"Sản phẩm": ["Size: S/M/L", "Màu: 3"], "Combo": ["Gồm: 5 bước"], "Liệu trình": ["Buổi: 8"], "Gói năm": ["Hạn: 12 tháng"], "Dịch vụ lẻ": ["Thời lượng: 60′"]}
PAL = [["#EDFAF3", "#1F9C4F", "ic-spark"], ["#EFF7FF", "#2B9EF3", "ic-gift"], ["#F3EEFE", "#8B5CF6", "ic-box"], ["#FFF8EC", "#C9820B", "ic-doc"], ["#FCEBEE", "#E0566A", "ic-box"], ["#E6F6F4", "#0E9B94", "ic-gift"]]
CAT_COLOR = {"Liệu trình": "#1F9C4F", "Combo": "#2B9EF3", "Gói năm": "#8B5CF6", "Dịch vụ lẻ": "#C9820B", "Sản phẩm": "#0E9B94"}
CAT_PAL = {"Liệu trình": ["#EDFAF3", "#1F9C4F", "ic-spark"], "Combo": ["#EFF7FF", "#2B9EF3", "ic-gift"], "Gói năm": ["#F3EEFE", "#8B5CF6", "ic-box"], "Dịch vụ lẻ": ["#FFF8EC", "#C9820B", "ic-doc"], "Sản phẩm": ["#E6F6F4", "#0E9B94", "ic-box"]}

products = []
for i, (name, cat, price, sold, status, chans, desc) in enumerate(RAW):
    t = TYPE[cat]
    products.append({
        "id": f"pd_{i + 1}",
        "code": f"SP-{1001 + i}",
        "name": name,
        "category": cat,
        "type": t,
        "price": price,
        "cost": str(round(int(price) * 0.62)),
        "unit": UNIT[i % 5],
        "tax_rate": 8,
        "sold": sold,
        "status": status,
        "channels": chans,
        "description": desc,
        "attrs": ATTRS[cat],
        "stock": 42 if t == "physical" else None,
        "sessions": 8 if name.startswith("HIFU") else None,
        "valid_days": 365 if cat == "Gói năm" else (60 if cat == "Liệu trình" else None),
        "tint": PAL[i % 6][0],
        "ink": PAL[i % 6][1],
        "icon": PAL[i % 6][2],
    })

out = {
    "categories": ["Liệu trình", "Combo", "Gói năm", "Dịch vụ lẻ", "Sản phẩm"],
    "category_color": CAT_COLOR,
    "category_pal": CAT_PAL,
    "products": products,
    "stats": {"channels": 7, "sold_month": 750},
    # Nguồn đồng bộ: connector registry (D28) — kênh có manifest đồng bộ được; sàn / POS "Sắp có" (D31)
    "sync_sources": [
        {"key": "zalo_personal", "color": "#0068FF", "status": "synced", "at": "12:30"},
        {"key": "webchat", "color": "#2DC56A", "status": "synced", "at": "12:30"},
        {"key": "shopee", "color": "#EE4D2D", "status": "soon"},
        {"key": "tiktok_shop", "color": "#111111", "status": "soon"},
        {"key": "sapo", "color": "#0088FF", "status": "soon"},
        {"key": "kiotviet", "color": "#1763F4", "status": "soon"},
    ],
    "files": [
        ["Ảnh sản phẩm — bộ 6 ảnh.jpg", "jpg", "Trâm · 20/10"],
        ["Video hướng dẫn sử dụng.mp4", "mp4", "Trâm · 18/10 · 24 MB"],
        ["Thông số kỹ thuật.pdf", "pdf", "Nhà cung cấp · 12/10"],
        ["Bảng giá sỉ theo số lượng.xlsx", "xlsx", "Minh · 05/10"],
    ],
    "history": [
        ["sale", "#2DC56A", "Hôm nay · 10:24"],
        ["price", "#6E48E6", "2 ngày trước · Minh"],
        ["import", "#2563EB", "5 ngày trước · tự động"],
        ["create", "#9CA3AF", "12/05/2026 · Trâm"],
    ],
    "crm_stats": [["buyers", "128", "#231F20"], ["revenue30", "42,6tr", "#157A40"], ["quotes", "6", "#1D4ED8"], ["pending", "3", "#B45309"]],
    # Trường riêng của Sản phẩm (prototype state.cfDefs.products L7760, bỏ trường hệ thống / trùng ô sẵn có của form — pdCfRows L9136)
    "custom_fields": [{"key": "warranty", "label": "Bảo hành", "type": "text"}],
    "crm_buyers": [["Chị Lan Nguyễn", "3 lần · 12,4tr", "KC"], ["Phương Vy", "2 lần · 6,1tr", "PV"], ["Anh Dũng", "1 lần · 4,2tr", "AD"]],
}
with open("fixtures/prototype-parity/products.json", "w", encoding="utf8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
    f.write("\n")
print(len(products), "products")
