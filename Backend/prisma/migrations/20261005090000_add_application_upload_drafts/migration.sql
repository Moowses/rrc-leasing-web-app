CREATE TABLE "ApplicationUploadDraft" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicationUploadDraft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApplicationDraftDocument" (
  "id" TEXT NOT NULL,
  "draftId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "data" BYTEA NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicationDraftDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApplicationUploadDraft_tokenHash_key" ON "ApplicationUploadDraft"("tokenHash");
CREATE INDEX "ApplicationUploadDraft_propertyId_expiresAt_idx" ON "ApplicationUploadDraft"("propertyId", "expiresAt");
CREATE INDEX "ApplicationDraftDocument_draftId_kind_idx" ON "ApplicationDraftDocument"("draftId", "kind");

ALTER TABLE "ApplicationUploadDraft" ADD CONSTRAINT "ApplicationUploadDraft_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationDraftDocument" ADD CONSTRAINT "ApplicationDraftDocument_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ApplicationUploadDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
