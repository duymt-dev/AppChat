-- TIP-028: Mẫu chứng từ (Blueprint §2.2 `doc_template`, D30 — standards/documents/templates.md). Mẫu `rich` (HTML + biến) hoặc `docx`
-- (tệp Word của DN + field_map đã người xác nhận). Xoá = xoá mềm (hoàn tác 24h). Mỗi loại tối đa một mẫu mặc định đang dùng.

-- CreateEnum
CREATE TYPE "doc_template_kind" AS ENUM ('quote', 'contract', 'payment_request', 'receipt');

-- CreateEnum
CREATE TYPE "doc_template_source" AS ENUM ('rich', 'docx');

-- CreateTable
CREATE TABLE "doc_template" (
    "id" UUID NOT NULL,
    "kind" "doc_template_kind" NOT NULL,
    "contract_kind" TEXT,
    "name" TEXT NOT NULL,
    "source" "doc_template_source" NOT NULL,
    "body_html" TEXT,
    "docx_file_id" UUID,
    "field_map" JSONB NOT NULL DEFAULT '[]',
    "checklist_result" JSONB NOT NULL DEFAULT '[]',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "doc_template_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "doc_template_source_body_chk" CHECK (("source" = 'rich' AND "body_html" IS NOT NULL) OR ("source" = 'docx' AND "docx_file_id" IS NOT NULL)),
    CONSTRAINT "doc_template_docx_file_fkey" FOREIGN KEY ("docx_file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Danh sách `GET /v1/doc-templates?kind=` (mặc định trước, mới sửa trước) + mẫu mặc định của loại khi render chứng từ.
CREATE INDEX "doc_template_live_kind_idx" ON "doc_template" ("kind", "is_default" DESC, "updated_at" DESC, "id")
  WHERE "deleted_at" IS NULL;

-- Một mẫu mặc định mỗi loại (đặt mặc định = tắt cờ cũ rồi bật cờ mới trong cùng transaction).
CREATE UNIQUE INDEX "doc_template_default_uq" ON "doc_template" ("kind") WHERE "is_default" AND "deleted_at" IS NULL;

-- Mẫu mặc định (rich) cho mọi workspace — template + mọi DB tenant đang có qua tenant-migrate. Đề nghị thanh toán / phiếu thu có dòng
-- "không thay thế hoá đơn GTGT" (COMMERCE §5). Bảng hàng luôn từ vòng {{#items}} (templates.md §1).
INSERT INTO "doc_template" ("id", "kind", "name", "source", "body_html", "is_default") VALUES
  (gen_random_uuid(), 'quote', 'Báo giá chuẩn', 'rich',
   '<h2>BÁO GIÁ {{doc.code}}</h2><p>{{business.legal_name}} · MST {{business.tax_code}}<br>{{business.address}}</p><p>Kính gửi: {{customer.name}}<br>Ngày lập: {{doc.date}}</p><table><tr><th>STT</th><th>Hàng hoá / dịch vụ</th><th>ĐVT</th><th>SL</th><th>Đơn giá</th><th>CK</th><th>Thành tiền</th></tr>{{#items}}<tr><td>{{no}}</td><td>{{name}}</td><td>{{unit}}</td><td>{{qty}}</td><td>{{price}}</td><td>{{discount}}</td><td>{{amount}}</td></tr>{{/items}}</table><p>Cộng: {{totals.subtotal}} · Chiết khấu: {{totals.discount}} · Thuế GTGT: {{totals.vat}}<br><b>Tổng cộng (đã gồm VAT): {{totals.total}}</b><br><i>{{totals.total_words}}</i></p><p>Báo giá có hiệu lực đến {{doc.valid_until}}. Người phụ trách: {{doc.owner}}</p>',
   true),
  (gen_random_uuid(), 'contract', 'Hợp đồng dịch vụ', 'rich',
   '<h2>HỢP ĐỒNG DỊCH VỤ {{doc.code}}</h2><p>Hôm nay, ngày {{doc.date}}, chúng tôi gồm:</p><p><b>BÊN A:</b> {{business.legal_name}} · MST {{business.tax_code}} · Đại diện: {{business.representative}}<br>Địa chỉ: {{business.address}}</p><p><b>BÊN B:</b> {{customer.name}} · MST {{customer.tax_code}} · Đại diện: {{customer.representative}}<br>Địa chỉ: {{customer.address}}</p><h3>Điều 1. Đối tượng và phạm vi dịch vụ</h3>{{#items}}<p>{{no}}. {{name}} — số lượng {{qty}} {{unit}}, đơn giá {{price}}</p>{{/items}}<h3>Điều 2. Giá trị hợp đồng và phương thức thanh toán</h3><p>Giá trị hợp đồng: {{contract.value}} ({{totals.total_words}}). Thanh toán bằng chuyển khoản vào tài khoản {{business.bank_account}}.</p><h3>Điều 3. Thời hạn và địa điểm thực hiện</h3><p>Từ {{contract.start}} đến {{contract.end}}, tại địa điểm hai bên thống nhất.</p><h3>Điều 4. Quyền và nghĩa vụ của các bên</h3><p>Bên A cung cấp dịch vụ đúng phạm vi, chất lượng đã thoả thuận; Bên B thanh toán đúng hạn.</p><h3>Điều 5. Vi phạm hợp đồng</h3><p>Bên vi phạm chịu phạt và bồi thường thiệt hại theo quy định pháp luật.</p><h3>Điều 6. Giải quyết tranh chấp</h3><p>Tranh chấp được thương lượng; không thành thì đưa ra Toà án có thẩm quyền.</p><h3>Điều 7. Hiệu lực</h3><p>Hợp đồng có hiệu lực từ ngày ký.</p><table><tr><td>ĐẠI DIỆN BÊN A<br>{{signatures.seller}}</td><td>ĐẠI DIỆN BÊN B<br>{{signatures.buyer}}</td></tr></table>',
   true),
  (gen_random_uuid(), 'payment_request', 'Đề nghị thanh toán', 'rich',
   '<h2>ĐỀ NGHỊ THANH TOÁN {{doc.code}}</h2><p>{{business.legal_name}} · MST {{business.tax_code}}</p><p>Kính gửi: {{customer.name}}<br>Ngày: {{doc.date}} · Hạn thanh toán: {{doc.valid_until}}</p>{{#items}}<p>{{no}}. {{name}} — {{amount}}</p>{{/items}}<p><b>Số tiền đề nghị: {{totals.total}}</b><br><i>{{totals.total_words}}</i></p><p>Chuyển khoản: {{business.bank_account}} · Nội dung: {{payment.transfer_note}}</p><p>{{payment.vietqr}}</p><p>Chứng từ này không thay thế hoá đơn giá trị gia tăng.</p>',
   true),
  (gen_random_uuid(), 'receipt', 'Phiếu thu', 'rich',
   '<h2>PHIẾU THU {{doc.code}}</h2><p>{{business.legal_name}} · {{business.address}}</p><p>Ngày: {{doc.date}}<br>Họ tên người nộp: {{customer.name}}</p><p><b>Số tiền: {{totals.total}}</b><br><i>{{totals.total_words}}</i></p><table><tr><td>NGƯỜI NỘP TIỀN<br>{{signatures.buyer}}</td><td>NGƯỜI THU TIỀN<br>{{signatures.seller}}</td></tr></table><p>Chứng từ này không thay thế hoá đơn giá trị gia tăng.</p>',
   true)
ON CONFLICT DO NOTHING;
