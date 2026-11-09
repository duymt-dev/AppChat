-- TIP-012c P2: bằng chứng thăm dò mail của kết nối (người gửi + trạng thái xác minh + có sự kiện giao thư) cho ĐÚNG phiên bản khoá đã
-- thăm dò (`probed_rev`) — nguồn của campaign.mail_senders. Không bí mật (không khoá / mật khẩu / host).
ALTER TABLE "integration_connection" ADD COLUMN "mail_senders" JSONB;
