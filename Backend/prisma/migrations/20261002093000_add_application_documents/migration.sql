-- AlterTable
ALTER TABLE "LeasingRequest" ADD COLUMN "applicationData" JSONB;

-- CreateTable
CREATE TABLE "ApplicationDocument" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationResubmissionLink" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "requiredDocuments" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationResubmissionLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationDocument_requestId_kind_idx" ON "ApplicationDocument"("requestId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationResubmissionLink_tokenHash_key" ON "ApplicationResubmissionLink"("tokenHash");

-- CreateIndex
CREATE INDEX "ApplicationResubmissionLink_requestId_expiresAt_idx" ON "ApplicationResubmissionLink"("requestId", "expiresAt");

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "LeasingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationResubmissionLink" ADD CONSTRAINT "ApplicationResubmissionLink_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "LeasingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
