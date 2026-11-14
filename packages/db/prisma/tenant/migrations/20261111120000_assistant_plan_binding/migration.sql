-- TIP-023d §2.2-2.3: ràng buộc thực thi bước kế hoạch.
--   assistant_plan_step.execution_generation — thế hệ thực thi hiện hành của bước (claim = plan + bước + thế hệ); chỉ sửa kế hoạch mới tăng
--                                            được, và chỉ cho bước CHƯA admitted (§3.5).
--   assistant_plan_primary_claim.job_id / status_url — handle việc nền đã nhận (202 job_accepted): gọi lại cùng claim trả đúng handle cũ,
--                                            không xếp việc lần hai (§2.2).
ALTER TABLE "assistant_plan_step" ADD COLUMN "execution_generation" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "assistant_plan_primary_claim" ADD COLUMN "job_id" TEXT, ADD COLUMN "status_url" TEXT;
-- Tra claim theo (plan, bước, thế hệ) đi thẳng khoá chính — không thêm index.

