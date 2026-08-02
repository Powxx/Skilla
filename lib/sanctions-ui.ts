import { SanctionStatus } from "@prisma/client";

/**
 * Libellés traduits en français pour l'affichage des statuts de sanction dans l'UI.
 */
export const STATUS_LABELS: Record<SanctionStatus, string> = {
  PLANIFIE: "Planifiée",
  REALISE: "Réalisée",
  NON_PRESENT: "Non présent",
  EXCUSE: "Excusée",
};

/**
 * Classes Tailwind CSS pour le rendu visuel (badges colorés) des statuts de sanction.
 */
export const STATUS_COLORS: Record<SanctionStatus, string> = {
  PLANIFIE: "bg-amber-50 text-amber-700 border-amber-200",
  REALISE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  NON_PRESENT: "bg-red-50 text-red-700 border-red-200",
  EXCUSE: "bg-slate-100 text-slate-600 border-slate-200",
};

/**
 * Libellés descriptifs pour les différents événements de conduite enregistrés.
 */
export const EVENT_TYPE_LABELS: Record<string, string> = {
  POINTS_DEDUCTED: "Points retirés",
  THRESHOLD_50: "Palier 50 pts",
  THRESHOLD_20: "Palier critique 20 pts",
};

/**
 * Classes Tailwind CSS pour la mise en forme graphique des événements de conduite dans l'historique.
 */
export const EVENT_TYPE_COLORS: Record<string, string> = {
  POINTS_DEDUCTED: "bg-slate-100 text-slate-700 border-slate-200",
  THRESHOLD_50: "bg-amber-50 text-amber-700 border-amber-200",
  THRESHOLD_20: "bg-red-50 text-red-700 border-red-200",
};
