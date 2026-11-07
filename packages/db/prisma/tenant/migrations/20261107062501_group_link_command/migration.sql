-- TIP-025b §A.6: lệnh đọc link tham gia (`link`) — kết quả chỉ giữ URL đã mã hoá, người yêu cầu đọc trong 10 phút.
ALTER TABLE "group_command" DROP CONSTRAINT "group_command_kind_check";
ALTER TABLE "group_command" ADD CONSTRAINT "group_command_kind_check" CHECK ("kind" IN ('add_members', 'update', 'set_mute', 'refresh', 'link'));
