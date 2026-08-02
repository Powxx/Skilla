import prisma from "@/lib/prisma";
import type { SatisfactionSurveyTarget } from "@prisma/client";

/**
 * Clé de configuration stockée dans la table GlobalSetting pour activer ou désactiver
 * les fonctionnalités Qualiopi (enquêtes de satisfaction, plaintes, réclamations).
 */
export const QUALIOPI_ENABLED_KEY = "QUALIOPI_ENABLED";

/**
 * Vérifie si le module Qualiopi est activé au niveau de l'établissement.
 * Par défaut, s'il n'y a pas de réglage enregistré, le module est considéré comme actif.
 * 
 * @returns true si Qualiopi est activé, false sinon.
 */
export async function isQualiopiEnabled(): Promise<boolean> {
  const setting = await prisma.globalSetting.findUnique({ where: { key: QUALIOPI_ENABLED_KEY } });
  return setting?.value !== "false";
}

/**
 * Libellés français correspondant aux cibles des enquêtes de satisfaction.
 */
export const SURVEY_TARGET_LABELS: Record<SatisfactionSurveyTarget, string> = {
  STUDENT: "Élèves",
  TEACHER: "Professeurs",
  RESPONSIBLE: "Parents / responsables",
  COMPANY_TUTOR: "Tuteurs entreprise",
  CLASS: "Une classe (élèves)",
};

/**
 * Libellés français conviviaux pour l'affichage des rôles dans les modules Qualiopi.
 */
export const ROLE_LABELS: Record<string, string> = {
  STUDENT: "Élève",
  TEACHER: "Professeur",
  RESPONSIBLE: "Parent",
  COMPANY_TUTOR: "Tuteur entreprise",
  ADMIN: "Administration",
  SUPER_ADMIN: "Administration",
};

/**
 * Génère le lien d'accès public à un questionnaire de satisfaction Qualiopi.
 * 
 * @param campaignId ID unique de la campagne de satisfaction.
 * @returns Le chemin relatif d'accès au questionnaire.
 */
export function surveyLinkForRole(campaignId: string): string {
  return `/survey/${campaignId}`;
}
