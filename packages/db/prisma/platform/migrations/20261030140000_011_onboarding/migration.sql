-- TIP-011: thông báo onboarding đã xem (chào mừng trial / hết trial) theo người × workspace.
-- AlterTable
ALTER TABLE "membership" ADD COLUMN     "notices_seen" TEXT[] DEFAULT ARRAY[]::TEXT[];
