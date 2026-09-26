"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getGlobalSettings } from "@/app/actions/settings";
import { isQualiopiEnabled } from "@/lib/qualiopi";

export type QualiopiIndicatorStatus = "CONFORME" | "ATTENTION" | "NON_CONFORME";

export type QualiopiIndicatorAudit = {
  indicatorNumber: number;
  criterionNumber: number;
  title: string;
  requirement: string;
  status: QualiopiIndicatorStatus;
  scorePct: number;
  keyMetricLabel: string;
  keyMetricValue: string;
  proofCount: number;
  proofsSummary: string[];
  recommendation?: string;
};

export type QualiopiAuditPayload = {
  schoolName: string;
  auditDate: string;
  globalReadinessScore: number; // Sur 100%
  indicators: QualiopiIndicatorAudit[];
  stats: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    activeContracts: number;
    attendanceRate: number;
    satisfactionAvg: number | null;
    satisfactionTotalResponses: number;
    openComplaints: number;
    resolvedComplaints: number;
    complaintsResolutionRate: number;
    competenciesTracked: number;
    evaluationsLogged: number;
  };
  actionPlan: {
    priority: "HIGH" | "MEDIUM" | "LOW";
    indicatorNumber: number;
    action: string;
  }[];
};

export async function getQualiopiAuditReport(): Promise<{ ok: true; data: QualiopiAuditPayload } | { ok: false; error: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return { ok: false, error: "Non autorisé. Accès réservé aux administrateurs." };
  }

  const enabled = await isQualiopiEnabled();
  if (!enabled) {
    return { ok: false, error: "Le module Qualiopi est actuellement désactivé." };
  }

  const now = new Date();
  const schoolYearStart = new Date(now.getFullYear(), 8, 1);

  // 1. Récupération parallèle de l'ensemble des données d'audit
  const [
    studentsCount,
    teachersCount,
    classesCount,
    attendances,
    complaints,
    surveys,
    campaigns,
    contracts,
    competenciesCount,
    evaluationsCount,
    skillMatricesCount,
    teachersWithSubjectsCount,
    settings
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT", isActive: true } }),
    prisma.user.count({ where: { role: "TEACHER", isActive: true } }),
    prisma.class.count(),
    prisma.attendance.findMany({
      where: {
        lesson: {
          startTime: { gte: schoolYearStart },
          isCancelled: false
        }
      },
      select: { status: true, isConfirmed: true }
    }),
    prisma.complaint.findMany({
      select: { id: true, status: true, subject: true, createdAt: true }
    }),
    prisma.satisfactionSurvey.findMany({
      select: { rating: true, campaign: { select: { targetType: true } } }
    }),
    prisma.satisfactionSurveyCampaign.findMany({
      select: { id: true, title: true, targetType: true, isActive: true, _count: { select: { responses: true } } }
    }),
    prisma.companyContract.findMany({
      select: { id: true, tutorId: true, companyName: true }
    }),
    prisma.classCompetency.count(),
    prisma.evaluation.count(),
    prisma.skillMatrix.count(),
    prisma.user.count({
      where: {
        role: "TEACHER",
        isActive: true,
        subjects: { some: {} }
      }
    }),
    getGlobalSettings()
  ]);

  // 2. Calculs Assiduité (Indicateur 11 & 2)
  const totalAttendances = attendances.length;
  let attendedCount = 0;
  let excusedCount = 0;
  let unexcusedCount = 0;

  for (const a of attendances) {
    if (a.status === "PRESENT" || a.status === "LATE") attendedCount++;
    else if (a.status === "EXCUSED") {
      excusedCount++;
      attendedCount++;
    } else if (a.status === "ABSENT") {
      unexcusedCount++;
    }
  }

  const attendanceRate = totalAttendances > 0 ? Math.round((attendedCount / totalAttendances) * 100) : 100;
  const justificationRate = (excusedCount + unexcusedCount) > 0 
    ? Math.round((excusedCount / (excusedCount + unexcusedCount)) * 100) 
    : 100;

  // 3. Calculs Réclamations (Indicateur 31)
  const totalComplaints = complaints.length;
  const resolvedComplaints = complaints.filter(c => c.status === "CLOSED").length;
  const openComplaints = totalComplaints - resolvedComplaints;
  const complaintsResolutionRate = totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 100;

  // 4. Calculs Enquêtes de satisfaction (Indicateur 30 & 2)
  const totalSurveyResponses = surveys.length;
  const satisfactionSum = surveys.reduce((acc, s) => acc + s.rating, 0);
  const satisfactionAvg = totalSurveyResponses > 0 ? Number((satisfactionSum / totalSurveyResponses).toFixed(1)) : null;
  const satisfactionPct = satisfactionAvg ? Math.round((satisfactionAvg / 5) * 100) : 0;

  // 5. Calculs Alternance (Indicateur 12)
  const totalContracts = contracts.length;
  const contractsWithTutor = contracts.filter(c => Boolean(c.tutorId)).length;
  const tutorLinkRate = totalContracts > 0 ? Math.round((contractsWithTutor / totalContracts) * 100) : 100;

  // 6. Calculs Formateurs (Indicateur 18)
  const teacherCoordinationRate = teachersCount > 0 ? Math.round((teachersWithSubjectsCount / teachersCount) * 100) : 100;

  // Construction des 6 indicateurs RNQ Qualiopi majeurs
  const indicators: QualiopiIndicatorAudit[] = [
    {
      indicatorNumber: 2,
      criterionNumber: 1,
      title: "Indicateurs de résultats & Diffusion publique",
      requirement: "L'organisme diffuse des indicateurs de résultats adaptés à la nature des prestations (assiduité, satisfaction, réussite).",
      status: satisfactionAvg && attendanceRate >= 80 ? "CONFORME" : "ATTENTION",
      scorePct: Math.min(100, Math.round(((attendanceRate + (satisfactionPct || 70)) / 2))),
      keyMetricLabel: "Satisfaction & Assiduité",
      keyMetricValue: `${satisfactionAvg ? `${satisfactionAvg}/5` : "En attente"} — Assid. ${attendanceRate}%`,
      proofCount: totalSurveyResponses + totalAttendances,
      proofsSummary: [
        `${totalSurveyResponses} évaluations de satisfaction recueillies`,
        `Taux d'assiduité certifié de ${attendanceRate}% sur ${totalAttendances} émargements`,
        `Publication automatisée disponible sur le tableau de bord public`
      ],
      recommendation: !satisfactionAvg ? "Lancer au moins une campagne de satisfaction pour consolider l'indicateur." : undefined
    },
    {
      indicatorNumber: 10,
      criterionNumber: 3,
      title: "Adaptation de la prestation & Suivi pédagogique",
      requirement: "L'organisme met en œuvre et trace l'évaluation continue des acquis et la progression des apprenants.",
      status: evaluationsCount > 0 && competenciesCount > 0 ? "CONFORME" : "ATTENTION",
      scorePct: competenciesCount > 0 ? Math.min(100, Math.round((evaluationsCount / Math.max(1, studentsCount * 5)) * 100)) : 40,
      keyMetricLabel: "Évaluations de compétences",
      keyMetricValue: `${evaluationsCount} validations (${competenciesCount} compétences définies)`,
      proofCount: evaluationsCount,
      proofsSummary: [
        `${competenciesCount} compétences enregistrées dans les référentiels de classe`,
        `${evaluationsCount} actes d'évaluation individuelle enregistrés avec échelle 1 à 4`,
        `Livret de compétences dématérialisé accessible en continu`
      ],
      recommendation: evaluationsCount === 0 ? "Enregistrer les premières évaluations du livret de compétences." : undefined
    },
    {
      indicatorNumber: 11,
      criterionNumber: 3,
      title: "Évaluation de l'assiduité & Prévention des ruptures",
      requirement: "L'organisme évalue l'atteinte des objectifs, assure le suivi de l'assiduité et met en œuvre des actions préventives.",
      status: attendanceRate >= 85 && justificationRate >= 70 ? "CONFORME" : "ATTENTION",
      scorePct: attendanceRate,
      keyMetricLabel: "Assiduité globale",
      keyMetricValue: `${attendanceRate}% (${justificationRate}% justifiées)`,
      proofCount: totalAttendances,
      proofsSummary: [
        `${totalAttendances} relevés d'émargement numériques horodatés`,
        `${excusedCount} absences dûment justifiées et archivées`,
        `Système de points de conduite et alertes disciplinaires automatiques (seuils 50/20 pts)`
      ],
      recommendation: unexcusedCount > excusedCount ? "Relancer les étudiants pour justifier les absences non traitées." : undefined
    },
    {
      indicatorNumber: 12,
      criterionNumber: 3,
      title: "Coordination des apprentissages en entreprise (CFA)",
      requirement: "L'organisme assure la coordination et l'évaluation avec le maître d'apprentissage en entreprise.",
      status: tutorLinkRate >= 80 ? "CONFORME" : "ATTENTION",
      scorePct: tutorLinkRate,
      keyMetricLabel: "Liaison tuteurs entreprise",
      keyMetricValue: `${tutorLinkRate}% rattachés (${totalContracts} contrats)`,
      proofCount: totalContracts,
      proofsSummary: [
        `${totalContracts} conventions et contrats d'apprentissage répertoriés`,
        `${contractsWithTutor} tuteurs d'entreprise dotés d'un compte actif avec accès au livret entreprise`,
        `Espace dédié Employeur avec suivi des présences et rendez-vous de suivi`
      ],
      recommendation: tutorLinkRate < 80 ? "Rattacher les coordonnées des maîtres d'apprentissage manquants." : undefined
    },
    {
      indicatorNumber: 18,
      criterionNumber: 4,
      title: "Coordination et qualification des formateurs",
      requirement: "L'organisme mobilise et coordonne des formateurs qualifiés disposant des compétences adaptées.",
      status: teacherCoordinationRate >= 90 ? "CONFORME" : "ATTENTION",
      scorePct: teacherCoordinationRate,
      keyMetricLabel: "Formateurs habilités",
      keyMetricValue: `${teachersWithSubjectsCount} / ${teachersCount} (${teacherCoordinationRate}%)`,
      proofCount: teachersCount + skillMatricesCount,
      proofsSummary: [
        `${teachersCount} enseignants et intervenants contractuels déclarés`,
        `${teacherCoordinationRate}% des professeurs rattachés formellement à leurs matières dans la grille`,
        `${skillMatricesCount} entrées dans la matrice de compétences pédagogiques`
      ]
    },
    {
      indicatorNumber: 30,
      criterionNumber: 7,
      title: "Recueil des appréciations des parties prenantes",
      requirement: "L'organisme recueille les appréciations des apprenants, financeurs, équipes pédagogiques et entreprises.",
      status: campaigns.length >= 2 ? "CONFORME" : "ATTENTION",
      scorePct: Math.min(100, campaigns.length * 35),
      keyMetricLabel: "Campagnes d'enquêtes",
      keyMetricValue: `${campaigns.length} campagnes (${totalSurveyResponses} réponses)`,
      proofCount: totalSurveyResponses,
      proofsSummary: [
        `${campaigns.length} campagnes de satisfaction Qualiopi enregistrées`,
        `${totalSurveyResponses} retours de sondage anonymisés et horodatés`,
        `Ciblage différencié : Élèves, Enseignants, Tuteurs et Responsables légaux`
      ],
      recommendation: campaigns.length < 2 ? "Créer une campagne spécifique pour les tuteurs en entreprise." : undefined
    },
    {
      indicatorNumber: 31,
      criterionNumber: 7,
      title: "Traitement des réclamations & Mesures correctives",
      requirement: "L'organisme met en œuvre des modalités de traitement des réclamations formulées par les parties prenantes.",
      status: openComplaints === 0 ? "CONFORME" : openComplaints <= 3 ? "ATTENTION" : "NON_CONFORME",
      scorePct: complaintsResolutionRate,
      keyMetricLabel: "Résolution des réclamations",
      keyMetricValue: `${complaintsResolutionRate}% traitées (${resolvedComplaints}/${totalComplaints})`,
      proofCount: totalComplaints,
      proofsSummary: [
        `Registre numérique officiel des réclamations actif`,
        `${resolvedComplaints} réclamation(s) instruite(s) et clôturée(s)`,
        `${openComplaints} réclamation(s) actuellement en cours d'instruction`
      ],
      recommendation: openComplaints > 0 ? `${openComplaints} réclamation(s) en attente de clôture administrative.` : undefined
    }
  ];

  // Calcul du score global
  const totalScore = indicators.reduce((acc, ind) => acc + ind.scorePct, 0);
  const globalReadinessScore = Math.round(totalScore / indicators.length);

  // Plan d'actions prioritaires
  const actionPlan: QualiopiAuditPayload["actionPlan"] = [];
  for (const ind of indicators) {
    if (ind.recommendation) {
      actionPlan.push({
        indicatorNumber: ind.indicatorNumber,
        priority: ind.status === "NON_CONFORME" ? "HIGH" : "MEDIUM",
        action: ind.recommendation
      });
    }
  }

  const schoolName = settings?.find(s => s.key === "SCHOOL_NAME")?.value || "ECM Académie - Skilla";

  return {
    ok: true,
    data: {
      schoolName,
      auditDate: now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
      globalReadinessScore,
      indicators,
      stats: {
        totalStudents: studentsCount,
        totalTeachers: teachersCount,
        totalClasses: classesCount,
        activeContracts: totalContracts,
        attendanceRate,
        satisfactionAvg,
        satisfactionTotalResponses: totalSurveyResponses,
        openComplaints,
        resolvedComplaints,
        complaintsResolutionRate,
        competenciesTracked: competenciesCount,
        evaluationsLogged: evaluationsCount
      },
      actionPlan
    }
  };
}
