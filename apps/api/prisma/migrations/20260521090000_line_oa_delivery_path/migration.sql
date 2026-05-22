-- LINE OA real delivery path: setup metadata, recipient capture, and delivery audit.

CREATE TYPE "LineOaRecipientType" AS ENUM ('USER', 'GROUP', 'ROOM');
CREATE TYPE "LineOaSetupStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');
CREATE TYPE "LineOaDeliveryStatus" AS ENUM ('PENDING', 'SKIPPED', 'SENT', 'FAILED', 'FALLBACK_SENT');

ALTER TABLE "Form"
  ADD COLUMN "lineOaChannelSecret" TEXT,
  ADD COLUMN "lineOaBotUserId" TEXT,
  ADD COLUMN "lineOaRecipientId" TEXT,
  ADD COLUMN "lineOaRecipientType" "LineOaRecipientType" NOT NULL DEFAULT 'USER',
  ADD COLUMN "lineOaSetupStatus" "LineOaSetupStatus" NOT NULL DEFAULT 'PENDING';

CREATE TABLE "LineOaDelivery" (
  "id" TEXT NOT NULL,
  "formSubmissionId" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "status" "LineOaDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "reasonCode" TEXT,
  "customerMessage" TEXT,
  "lineRequestId" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "attemptedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LineOaDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LineOaDelivery_formSubmissionId_key"
  ON "LineOaDelivery"("formSubmissionId");
CREATE INDEX "Form_lineOaBotUserId_idx" ON "Form"("lineOaBotUserId");
CREATE INDEX "LineOaDelivery_formId_status_idx" ON "LineOaDelivery"("formId", "status");
CREATE INDEX "LineOaDelivery_status_sentAt_idx" ON "LineOaDelivery"("status", "sentAt");
CREATE INDEX "LineOaDelivery_reasonCode_idx" ON "LineOaDelivery"("reasonCode");

ALTER TABLE "LineOaDelivery"
  ADD CONSTRAINT "LineOaDelivery_formSubmissionId_fkey"
  FOREIGN KEY ("formSubmissionId") REFERENCES "FormSubmission"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LineOaDelivery"
  ADD CONSTRAINT "LineOaDelivery_formId_fkey"
  FOREIGN KEY ("formId") REFERENCES "Form"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
