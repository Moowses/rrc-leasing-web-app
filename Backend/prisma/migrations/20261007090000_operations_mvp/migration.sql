ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'ADMIN';
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'HR_MANAGER';
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'HR_STAFF';
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'CONTENT_MANAGER';

CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED');
CREATE TYPE "JobPostingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED');
CREATE TYPE "CareerApplicationStatus" AS ENUM ('NEW', 'IN_REVIEW', 'INTERVIEW', 'OFFERED', 'DECLINED', 'CLOSED');

ALTER TABLE "Property" ADD COLUMN "status" "PropertyStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Property" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "Property" ADD COLUMN "publishedById" TEXT;
ALTER TABLE "Property" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Property" ADD COLUMN "archivedById" TEXT;
UPDATE "Property" SET "status" = CASE WHEN "isPublished" THEN 'PUBLISHED'::"PropertyStatus" ELSE 'DRAFT'::"PropertyStatus" END;
UPDATE "Property" SET "publishedAt" = "updatedAt" WHERE "status" = 'PUBLISHED';

ALTER TABLE "LeasingRequest" ADD COLUMN "assignedToId" TEXT;
ALTER TABLE "LeasingRequest" ADD COLUMN "consentId" TEXT;
ALTER TABLE "Notification" ADD COLUMN "entityType" TEXT;
ALTER TABLE "Notification" ADD COLUMN "entityId" TEXT;
ALTER TABLE "Notification" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "Notification" ADD COLUMN "deliveredAt" TIMESTAMP(3);

CREATE TABLE "ConsentRecord" (
  "id" TEXT NOT NULL,
  "subjectType" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "consentType" TEXT NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ConsentRecord_subjectType_subjectId_acceptedAt_idx" ON "ConsentRecord"("subjectType", "subjectId", "acceptedAt");

CREATE TABLE "EmailDelivery" (
  "id" TEXT NOT NULL,
  "relatedEntityType" TEXT NOT NULL,
  "relatedEntityId" TEXT NOT NULL,
  "templateKey" TEXT NOT NULL,
  "recipientEmail" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "errorCode" TEXT,
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EmailDelivery_relatedEntityType_relatedEntityId_queuedAt_idx" ON "EmailDelivery"("relatedEntityType", "relatedEntityId", "queuedAt");
CREATE INDEX "EmailDelivery_status_queuedAt_idx" ON "EmailDelivery"("status", "queuedAt");

CREATE TABLE "JobPosting" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "employmentType" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "requirements" TEXT NOT NULL,
  "status" "JobPostingStatus" NOT NULL DEFAULT 'DRAFT',
  "opensAt" TIMESTAMP(3),
  "closesAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "JobPosting_reference_key" ON "JobPosting"("reference");
CREATE INDEX "JobPosting_status_publishedAt_idx" ON "JobPosting"("status", "publishedAt");

CREATE TABLE "CareerApplication" (
  "id" TEXT NOT NULL,
  "jobPostingId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "coverNote" TEXT,
  "status" "CareerApplicationStatus" NOT NULL DEFAULT 'NEW',
  "consentId" TEXT,
  "assignedToId" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareerApplication_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CareerApplication_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "CareerApplication_jobPostingId_status_submittedAt_idx" ON "CareerApplication"("jobPostingId", "status", "submittedAt");
CREATE INDEX "CareerApplication_assignedToId_status_idx" ON "CareerApplication"("assignedToId", "status");

CREATE TABLE "CareerDocument" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "data" BYTEA NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CareerDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CareerDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "CareerApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CareerDocument_applicationId_kind_idx" ON "CareerDocument"("applicationId", "kind");

CREATE TABLE "CareerApplicationEvent" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "actorId" TEXT,
  "eventType" TEXT NOT NULL,
  "previousStatus" "CareerApplicationStatus",
  "nextStatus" "CareerApplicationStatus",
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CareerApplicationEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CareerApplicationEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "CareerApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CareerApplicationEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "CareerApplicationEvent_applicationId_createdAt_idx" ON "CareerApplicationEvent"("applicationId", "createdAt");
CREATE INDEX "CareerApplicationEvent_actorId_createdAt_idx" ON "CareerApplicationEvent"("actorId", "createdAt");
