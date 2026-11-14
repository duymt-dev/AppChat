-- TIP-031c (COMMERCE §4b L109, COM-4b-5, REQ-F07b-3): bút toán đối soát tồn kho từ hệ thống ngoài (`stock_master = external`).
ALTER TYPE "stock_movement_kind" ADD VALUE IF NOT EXISTS 'sync_adjust';
