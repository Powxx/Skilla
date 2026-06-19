import prisma from "@/lib/prisma";
import type { SatisfactionSurveyTarget } from "@prisma/client";

export const QUALIOPI_ENABLED_KEY = "QUALIOPI_ENABLED";

export async function isQualiopiEnabled(): Promise<boolean> {
  const setting = await prisma.globalSetting.findUnique({ where: { key: QUALIOPI_ENABLED_KEY } });
  return setting?.value !== "false";
}

export const SURVEY_TARGET_LABELS: Record<SatisfactionSurveyTarget, string> = {
  STUDENT: "Élèves",
  TEACHER: "Professeurs",
  RESPONSIBLE: "Parents / responsables",
  COMPANY_TUTOR: "Tuteurs entreprise",
  CLASS: "Une classe (élèves)",
};

export const ROLE_LABELS: Record<string, string> = {
  STUDENT: "Élève",
  TEACHER: "Professeur",
  RESPONSIBLE: "Parent",
  COMPANY_TUTOR: "Tuteur entreprise",
  ADMIN: "Administration",
  SUPER_ADMIN: "Administration",
};

export function surveyLinkForRole(campaignId: string): string {
  return `/survey/${campaignId}`;
}
