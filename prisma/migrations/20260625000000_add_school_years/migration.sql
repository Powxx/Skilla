-- Add SchoolYear model and link to Semester
-- Replace monthlyHours with annualHours on TeacherContract

-- Create SchoolYear table
CREATE TABLE "SchoolYear" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolYear_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchoolYear_name_key" ON "SchoolYear"("name");

-- Add schoolYearId to Semester
ALTER TABLE "Semester" ADD COLUMN IF NOT EXISTS "schoolYearId" TEXT;
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "Semester_schoolYearId_idx" ON "Semester"("schoolYearId");

-- Replace monthlyHours with annualHours on TeacherContract
ALTER TABLE "TeacherContract" RENAME COLUMN "monthlyHours" TO "annualHours";
