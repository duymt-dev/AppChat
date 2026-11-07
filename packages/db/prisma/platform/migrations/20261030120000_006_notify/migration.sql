-- CreateTable
CREATE TABLE "notification_pref" (
    "user_id" UUID NOT NULL,
    "events" JSONB NOT NULL DEFAULT '{}',
    "dnd" JSONB NOT NULL DEFAULT '{"on":false,"from":"22:00","to":"08:00"}',
    "sound" BOOLEAN NOT NULL DEFAULT true,
    "digest" TEXT NOT NULL DEFAULT 'daily',
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pref_pkey" PRIMARY KEY ("user_id")
);

