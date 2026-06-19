-- Qualiopi: campaigns + survey responses by user profile

CREATE TYPE "SatisfactionSurveyTarget" AS ENUM ('STUDENT', 'TEACHER', 'RESPONSIBLE', 'COMPANY_TUTOR', 'CLASS');

CREATE TABLE "SatisfactionSurveyCampaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetType" "SatisfactionSurveyTarget" NOT NULL,
    "classId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "SatisfactionSurveyCampaign_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SatisfactionSurvey" DROP CONSTRAINT IF EXISTS "SatisfactionSurvey_studentId_fkey";
ALTER TABLE "SatisfactionSurvey" RENAME COLUMN "studentId" TO "userId";
ALTER TABLE "SatisfactionSurvey" ADD COLUMN IF NOT EXISTS "comment" TEXT;
ALTER TABLE "SatisfactionSurvey" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
ALTER TABLE "SatisfactionSurvey" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "SatisfactionSurvey" ADD CONSTRAINT "SatisfactionSurvey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SatisfactionSurvey" ADD CONSTRAINT "SatisfactionSurvey_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SatisfactionSurveyCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SatisfactionSurveyCampaign" ADD CONSTRAINT "SatisfactionSurveyCampaign_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SatisfactionSurveyCampaign" ADD CONSTRAINT "SatisfactionSurveyCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "SatisfactionSurvey_userId_campaignId_key" ON "SatisfactionSurvey"("userId", "campaignId");
CREATE INDEX "SatisfactionSurvey_userId_idx" ON "SatisfactionSurvey"("userId");
CREATE INDEX "SatisfactionSurvey_campaignId_idx" ON "SatisfactionSurvey"("campaignId");
CREATE INDEX "SatisfactionSurveyCampaign_createdAt_idx" ON "SatisfactionSurveyCampaign"("createdAt");
CREATE INDEX "SatisfactionSurveyCampaign_isActive_idx" ON "SatisfactionSurveyCampaign"("isActive");
