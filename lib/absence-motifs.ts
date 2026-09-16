export const ABSENCE_MOTIFS = [
  "Maladie / Certificat médical",
  "Rendez-vous médical / Hospitalisation",
  "Impératif familial / Raison familiale",
  "Problème de transport / Retard train-bus",
  "Convocation administrative / officielle",
  "Stage / Entretien d'embauche / Entreprise",
  "Événement exceptionnel",
  "Autre (saisie libre)",
] as const;

export type AbsenceMotif = typeof ABSENCE_MOTIFS[number];
