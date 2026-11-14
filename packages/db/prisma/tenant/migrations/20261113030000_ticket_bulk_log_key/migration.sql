-- TIP-034c §3.1: hoàn tác hàng loạt tra thao tác đi theo action_log của yêu cầu (một việc / action_log — mọi createJob trước đây ghi null).
CREATE UNIQUE INDEX "data_job_action_log_key" ON "data_job" ("action_log_id") WHERE "action_log_id" IS NOT NULL;
