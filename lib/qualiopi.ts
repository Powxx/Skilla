import prisma from "@/lib/prisma";
import type { SatisfactionSurveyTarget } from "@prisma/client";

/**
 * Clé de configuration stockée dans la table GlobalSetting pour activer ou désactiver
 * les fonctionnalités Qualiopi (enquêtes de satisfaction, plaintes, réclamations).
 */
export const QUALIOPI_ENABLED_KEY = "QUALIOPI_ENABLED";

/**
 * Vérifie si le module Qualiopi est activé au niveau de l'établissement.
 * Le module est désactivé par défaut jusqu'à activation explicite dans les paramètres ("true").
 * 
 * @returns true si Qualiopi est activé, false sinon.
 */
export async function isQualiopiEnabled(): Promise<boolean> {
  const setting = await prisma.globalSetting.findUnique({ where: { key: QUALIOPI_ENABLED_KEY } });
  return setting?.value === "true";
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
 * Catégories normées pour le recueil des réclamations (Qualiopi Indicateur 31).
 */
export const COMPLAINT_CATEGORIES = [
  { id: "PEDAGOGIE", label: "Pédagogie & Enseignement", icon: "GraduationCap" },
  { id: "ORGANISATION", label: "Organisation & Planning", icon: "Calendar" },
  { id: "LOCAUX_MATERIEL", label: "Locaux, Outils & Matériel", icon: "Building" },
  { id: "ADMINISTRATIF", label: "Administratif & Contrat d'apprentissage", icon: "FileText" },
  { id: "RELATIONNEL", label: "Climat & Relationnel", icon: "Users" },
  { id: "AUTRE", label: "Autre demande", icon: "HelpCircle" },
] as const;

export type ComplaintCategory = typeof COMPLAINT_CATEGORIES[number]["id"];

/**
 * Statuts officiels de traitement d'une réclamation.
 */
export const COMPLAINT_STATUS_LABELS: Record<string, { label: string; color: string; badgeBg: string }> = {
  OPEN: { label: "Reçue & En attente", color: "text-amber-700", badgeBg: "bg-amber-50 border-amber-200" },
  IN_PROGRESS: { label: "En cours d'instruction", color: "text-blue-700", badgeBg: "bg-blue-50 border-blue-200" },
  RESOLVED: { label: "Mesure prise / Résolue", color: "text-emerald-700", badgeBg: "bg-emerald-50 border-emerald-200" },
  CLOSED: { label: "Clôturée", color: "text-slate-600", badgeBg: "bg-slate-100 border-slate-200" },
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

