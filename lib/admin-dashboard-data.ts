import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { formatTeacherName, formatStudentName, formatUserName } from "@/lib/user-utils";
import { getGlobalSettings } from "@/app/actions/settings";
import { QUALIOPI_ENABLED_KEY } from "@/lib/qualiopi";
import {
  subDays,
  startOfWeek,
  endOfWeek,
  format,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from "date-fns";
import { fr } from "date-fns/locale";

// Périodes temporelles d'analyse du tableau de bord
export type AdminDashboardPeriod = "7d" | "30d" | "90d" | "semester";

// Filtres de sélection applicables au tableau de bord
export type AdminDashboardFilters = {
  semesterId?: string;
  classId?: string;
  period?: AdminDashboardPeriod;
};

// Structure simplifiée pour le calcul de moyenne
type GradeLite = { value: number; coefficient: number };

/**
 * Calcule la moyenne générale pondérée d'une liste de notes.
 * 
 * @param grades Tableau de notes contenant la valeur et le coefficient.
 * @returns Moyenne pondérée ou null si aucune note n'est disponible.
 */
function weightedAverage(grades: GradeLite[]): number | null {
  if (grades.length === 0) return null;
  let sumWx = 0; // Somme des (valeur * coefficient)
  let sumC = 0;  // Somme des coefficients
  for (const g of grades) {
    // Si le coefficient est invalide ou <= 0, on applique un coefficient par défaut de 1
    const c = Number.isFinite(g.coefficient) && g.coefficient > 0 ? g.coefficient : 1;
    sumWx += g.value * c;
    sumC += c;
  }
  if (sumC <= 0) return null;
  return sumWx / sumC;
}

/**
 * Calcule l'écart-type d'une série de valeurs numériques (mesure de dispersion des notes).
 */
function calculateStandardDeviation(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
  return Math.round(Math.sqrt(variance) * 10) / 10;
}

/**
 * Calcule le nombre d'heures écoulées entre deux dates.
 */
function lessonHours(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

/**
 * Calcule les heures d'enseignement d'une liste de cours en fusionnant les créneaux 
 * chevauchants / simultanés par professeur (même algorithme que dans le planning).
 */
function calculateMergedTeacherHours(
  lessons: { startTime: Date; endTime: Date; teacherId?: string | null }[]
): number {
  if (lessons.length === 0) return 0;

  const teacherMap = new Map<string, { start: number; end: number }[]>();
  let unassignedMs = 0;

  for (const lesson of lessons) {
    const startMs = lesson.startTime.getTime();
    const endMs = lesson.endTime.getTime();
    if (endMs <= startMs) continue;

    if (!lesson.teacherId) {
      unassignedMs += endMs - startMs;
      continue;
    }

    const intervals = teacherMap.get(lesson.teacherId) ?? [];
    intervals.push({ start: startMs, end: endMs });
    teacherMap.set(lesson.teacherId, intervals);
  }

  let totalTeacherMs = 0;

  for (const intervals of teacherMap.values()) {
    if (intervals.length === 0) continue;
    intervals.sort((a, b) => a.start - b.start);

    const merged: { start: number; end: number }[] = [intervals[0]];
    for (let i = 1; i < intervals.length; i++) {
      const current = intervals[i];
      const last = merged[merged.length - 1];

      if (current.start < last.end) {
        last.end = Math.max(last.end, current.end);
      } else {
        merged.push(current);
      }
    }

    totalTeacherMs += merged.reduce((acc, curr) => acc + (curr.end - curr.start), 0);
  }

  return (totalTeacherMs + unassignedMs) / (1000 * 60 * 60);
}

/**
 * Fusionne les créneaux d'heures chevauchants pour un professeur unique et renvoie le total d'heures.
 */
function calculateSingleTeacherMergedHours(
  intervals: { start: number; end: number }[]
): number {
  if (intervals.length === 0) return 0;
  intervals.sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number }[] = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const current = intervals[i];
    const last = merged[merged.length - 1];

    if (current.start < last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push(current);
    }
  }

  const totalMs = merged.reduce((acc, curr) => acc + (curr.end - curr.start), 0);
  return totalMs / (1000 * 60 * 60);
}

// Format d'une alerte affichée dans la barre latérale du dashboard
export type AdminAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  label: string;
  count: number;
  href: string;
};

// Payload complet renvoyé à l'interface d'administration
export type AdminDashboardPayload = {
  schoolName: string;
  qualiopiEnabled: boolean;
  filterOptions: {
    semesters: { id: string; name: string; schoolYear: string | null }[];
    classes: { id: string; name: string }[];
    selectedSemesterId: string | null;
    selectedClassId: string | null;
    selectedPeriod: AdminDashboardPeriod;
  };
  alerts: AdminAlert[];
  kpis: {
    students: number;
    teachers: number;
    classes: number;
    attendanceRate: number; // Taux d'assiduité réglementaire (Présents + Excusés + Retards)
    unjustifiedAbsenceRate: number; // Taux d'absentéisme injustifié (décrochage)
    pendingJustifications: number; // Absences à justifier (< 48h)
    overdueAbsences: number; // Absences injustifiées / hors délai (> 48h)
    generalAverage: number | null;
    gradeStdDev: number | null; // Indicateur 2 : Dispersion / Écart-type des notes
    gradeCompletionPct: number; // Indicateur 1 : Taux de complétude des notes par matière
    rollCallValidationRate: number; // Indicateur 9 : Taux d'appels validés dans les temps
    roomOccupancyRate: number; // Indicateur 10 : Taux d'occupation des salles
    parentActivationPct: number; // Indicateur 13 : Taux d'activation des comptes parents
    sanctionsCount: number;
    reportCardsPct: number;
    competencyAcquiredPct: number;
    hrHoursRealized: number;
    hrHoursProjected: number;
    hrRealizationRate: number;
    contractCoveragePct: number;
    parentLinkPct: number;
    satisfactionAvg: number | null;
    openComplaints: number;
    pendingRollCalls: number;
    teacherAttendanceRate: number;
  };
  monthlyLoginsByRole: {
    role: string;
    label: string;
    total: number;
    activeMonthly: number;
    percentage: number;
  }[];
  charts: {
    attendanceWeekly: {
      week: string;
      rate: number;
      unjustifiedRate: number;
      present: number;
      excused: number;
      unjustified: number;
      pending: number;
    }[];
    classAverages: { className: string; average: number }[];
    sanctionsByType: { type: string; count: number }[];
    hrHoursWeekly: { week: string; planned: number; realized: number; gap: number }[];
    satisfactionMonthly: { month: string; avg: number; count: number }[];
    teacherWorkloadByTeacher: {
      teacherName: string;
      realized: number;
      planned: number;
      total: number;
      percentage: number;
    }[];
  };
  miniTables: {
    topClasses: { classId: string; className: string; average: number }[];
    atRiskClasses: {
      classId: string;
      className: string;
      attendanceRate: number;
      unjustifiedRate: number;
      average: number | null;
    }[];
    atRiskStudents: {
      id: string;
      studentName: string;
      className: string;
      unjustifiedCount: number;
      conductPoints: number;
    }[];
    weakCompetencies: { name: string; acquiredPct: number; total: number }[];
    recentDisciplineEvents: {
      id: string;
      type: string;
      description: string;
      studentName: string;
      createdAt: string;
    }[];
    expiringContracts: {
      id: string;
      studentName: string;
      companyName: string;
      endDate: string;
      daysLeft: number;
    }[];
  };
  qualiopi: {
    openComplaints: number;
    closedComplaints: number;
    satisfactionAvg: number | null;
    satisfactionCount: number;
    recentComplaints: {
      id: string;
      subject: string;
      status: string;
      createdAt: string;
      senderName: string;
    }[];
    ratingDistribution: { rating: number; count: number }[];
  };
  pendingActions: {
    pendingMeetings: number;
    pendingSubstitutions: number;
  };
};

/**
 * Résout la date de début de la période d'analyse en fonction du choix utilisateur.
 */
function resolvePeriodStart(period: AdminDashboardPeriod, semester: { startDate: Date } | null): Date {
  const now = new Date();
  if (period === "semester" && semester) return semester.startDate;
  if (period === "7d") return subDays(now, 7);
  if (period === "30d") return subDays(now, 30);
  return subDays(now, 90);
}

/**
 * Fonction principale chargeant l'intégralité des indicateurs du tableau de bord de l'administrateur.
 * Regroupe et exécute en parallèle les requêtes Prisma pour maximiser les performances de chargement.
 * 
 * @param filters Filtres de sélection (période, classe, semestre).
 * @returns Le payload complet d'indicateurs et graphiques.
 */
async function calculateAdminDashboardPayload(
  filters: AdminDashboardFilters = {},
): Promise<AdminDashboardPayload> {
  const now = new Date();
  const period = filters.period ?? "30d";

  // 1. Récupération des filtres globaux et options de sélection
  const [semesters, classes, globalSettings, schoolYears] = await Promise.all([
    prisma.semester.findMany({
      orderBy: { startDate: "desc" },
      include: { schoolYear: { select: { name: true } } },
    }),
    prisma.class.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getGlobalSettings(),
    prisma.schoolYear.findMany({ orderBy: { startDate: "desc" } }),
  ]);

  // Détermine le semestre et l'année scolaire en cours en fonction de la date actuelle
  const currentSemester =
    semesters.find((s) => isWithinInterval(now, { start: s.startDate, end: s.endDate })) ??
    semesters[0] ??
    null;

  const currentSchoolYear =
    schoolYears.find((sy) => now >= sy.startDate && now <= sy.endDate) ?? schoolYears[0] ?? null;

  const selectedSemesterId = filters.semesterId ?? currentSemester?.id ?? null;
  const selectedSemester = semesters.find((s) => s.id === selectedSemesterId) ?? currentSemester;
  const selectedClassId = filters.classId ?? null;
  const periodStart = resolvePeriodStart(period, selectedSemester);

  const schoolName =
    globalSettings.find((s) => s.key === "SCHOOL_NAME")?.value ?? "ECM Académie";

  const qualiopiEnabled =
    globalSettings.find((s) => s.key === QUALIOPI_ENABLED_KEY)?.value === "true";

  // Filtre réutilisable pour cibler uniquement les étudiants actifs de la classe filtrée
  const studentWhere = {
    role: "STUDENT" as const,
    isActive: true,
    ...(selectedClassId ? { classId: selectedClassId } : {}),
  };

  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Plage de dates de l'année scolaire pour l'annualisation de la charge de travail des profs
  const schoolYearStart = currentSchoolYear?.startDate ?? subDays(now, 365);
  const schoolYearEnd = currentSchoolYear?.endDate ?? now;

  // 2. Agrégation des données de base en parallèle (KPIs, absences, notes, sanctions, logistique, connexions)
  const [
    studentsCount,
    teachersCount,
    classesCount,
    students,
    grades,
    attendances,
    sanctions,
    reportCards,
    evaluations,
    lessonsThisMonth,
    companyContracts,
    studentsWithParents,
    disciplineEvents,
    complaints,
    surveys,
    pendingMeetings,
    pendingSubstitutions,
    pendingRollCalls,
    pendingJustificationsCount,
    overdueAbsencesCount,
    conductAtRisk,
    annualLessonsForTeachers,
    allRecentLessons,
    allSubjects,
    rooms,
    roomLessons,
    allActiveUsers,
  ] = await Promise.all([
    prisma.user.count({ where: studentWhere }),
    prisma.user.count({ where: { role: "TEACHER", isActive: true } }),
    prisma.class.count(),
    prisma.user.findMany({
      where: studentWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        classId: true,
        conductPoints: true,
        class: { select: { id: true, name: true } },
        responsibles: { select: { id: true } },
        studentContracts: {
          where: { endDate: { gte: now } },
          select: { id: true },
        },
      },
    }),
    prisma.grade.findMany({
      where: selectedSemesterId ? { semesterId: selectedSemesterId } : undefined,
      select: {
        value: true,
        coefficient: true,
        studentId: true,
        subjectId: true,
        student: { select: { classId: true } },
      },
    }),
    prisma.attendance.findMany({
      where: {
        lesson: {
          startTime: { gte: subDays(now, 84) }, // Historique de présence sur 12 semaines
          isCancelled: false,
          ...(selectedClassId ? { classId: selectedClassId } : {}),
        },
        ...(selectedClassId
          ? { student: { classId: selectedClassId } }
          : {}),
      },
      select: {
        status: true,
        isConfirmed: true,
        lesson: { select: { startTime: true, endTime: true } },
        studentId: true,
      },
    }),
    prisma.sanction.findMany({
      where: {
        date: { gte: periodStart },
        ...(selectedClassId ? { student: { classId: selectedClassId } } : {}),
      },
      include: { sanctionType: { select: { name: true } } },
    }),
    selectedSemesterId
      ? prisma.reportCard.findMany({ where: { semesterId: selectedSemesterId } })
      : Promise.resolve([]),
    prisma.evaluation.findMany({
      where: selectedSemesterId ? { semesterId: selectedSemesterId } : undefined,
      select: { competency: true, level: true },
    }),
    prisma.lesson.findMany({
      where: {
        startTime: { gte: monthStart },
        endTime: { lte: monthEnd },
        isCancelled: false,
      },
      select: { startTime: true, endTime: true, teacherId: true },
    }),
    prisma.companyContract.findMany({
      where: { endDate: { gte: now } },
      select: {
        id: true,
        studentId: true,
        companyName: true,
        endDate: true,
        student: { select: { id: true, firstName: true, lastName: true, classId: true } },
      },
      orderBy: { endDate: "asc" },
      take: 20,
    }),
    prisma.user.findMany({
      where: {
        ...studentWhere,
        responsibles: { some: {} },
      },
      select: { id: true },
    }),
    prisma.sanctionActionEvent.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { firstName: true, lastName: true } },
      },
    }),
    qualiopiEnabled
      ? prisma.complaint.findMany({
          include: {
            sender: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : Promise.resolve([]),
    qualiopiEnabled
      ? prisma.satisfactionSurvey.findMany({
          select: { rating: true, createdAt: true },
        })
      : Promise.resolve([]),
    prisma.meetingRequest.count({ where: { status: "PENDING" } }),
    prisma.substitutionRequest.count({ where: { status: "PENDING" } }),
    prisma.lesson.count({
      where: {
        startTime: { lt: now },
        isCancelled: false,
        isAttendanceValidated: false, // Cours passés dont l'appel n'a pas été validé
      },
    }),
    // Absences en attente de justification sous le délai légal de 48h (flux normal de régularisation)
    prisma.attendance.count({
      where: {
        status: "ABSENT",
        isConfirmed: false,
        lesson: {
          startTime: { gte: subDays(now, 2) },
          isCancelled: false,
          ...(selectedClassId ? { classId: selectedClassId } : {}),
        },
        ...(selectedClassId ? { student: { classId: selectedClassId } } : {}),
      },
    }),
    // Absences en souffrance / non régularisées dépassant le délai de 48h
    prisma.attendance.count({
      where: {
        status: "ABSENT",
        isConfirmed: false,
        lesson: {
          startTime: { lt: subDays(now, 2) },
          isCancelled: false,
          ...(selectedClassId ? { classId: selectedClassId } : {}),
        },
        ...(selectedClassId ? { student: { classId: selectedClassId } } : {}),
      },
    }),
    prisma.user.count({
      where: {
        ...studentWhere,
        conductPoints: { lte: 50 }, // Étudiants sous le premier palier d'alerte de conduite
      },
    }),
    // Charge de cours annuelle pour le suivi des contrats profs (Ressources Humaines)
    prisma.lesson.findMany({
      where: {
        startTime: { gte: schoolYearStart },
        endTime: { lte: schoolYearEnd },
      },
      select: {
        startTime: true,
        endTime: true,
        isCancelled: true,
        teacherId: true,
        teacher: { select: { firstName: true, lastName: true } },
      },
    }),
    // Leçons sur 12 semaines pour le graphique hebdomadaire RH et le suivi des émargements
    prisma.lesson.findMany({
      where: {
        startTime: { gte: subDays(now, 84) },
        isCancelled: false,
      },
      select: { startTime: true, endTime: true, teacherId: true, isAttendanceValidated: true },
    }),
    // Liste des matières pour le suivi de complétude des notes (Indicateur 1)
    prisma.subject.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    // Salles pour le calcul du taux d'occupation (Indicateur 10)
    prisma.room.findMany({
      select: { id: true, name: true, capacity: true },
    }),
    // Cours en salle sur la période pour le taux d'occupation (Indicateur 10)
    prisma.lesson.findMany({
      where: {
        startTime: { gte: periodStart },
        endTime: { lte: now },
        isCancelled: false,
        roomId: { not: null },
      },
      select: { startTime: true, endTime: true, roomId: true },
    }),
    // Utilisateurs actifs pour l'activation parent (Indicateur 13) et connexions mensuelles
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, role: true, lastLoginAt: true },
    }),
  ]);

  // 3. Calculs des KPIs principaux
  const studentIds = new Set(students.map((s) => s.id));
  const filteredGrades = grades.filter((g) => studentIds.has(g.studentId));

  // Calcul de la moyenne générale de l'école ou de la classe filtrée
  const generalAverage = weightedAverage(filteredGrades);

  // Indicateur 2 : Indice de dispersion des notes (Écart-type standard)
  const gradeStdDev = calculateStandardDeviation(filteredGrades.map((g) => g.value));

  // Indicateur 1 : Taux de complétude des notes par matière (matières ayant >= 2 notes)
  const subjectGradeCountMap = new Map<string, number>();
  for (const g of filteredGrades) {
    if (g.subjectId) {
      subjectGradeCountMap.set(g.subjectId, (subjectGradeCountMap.get(g.subjectId) ?? 0) + 1);
    }
  }
  const totalSubjectsEvaluated = allSubjects.length;
  const subjectsWithMinGrades = allSubjects.filter(
    (s) => (subjectGradeCountMap.get(s.id) ?? 0) >= 2
  ).length;
  const gradeCompletionPct =
    totalSubjectsEvaluated > 0
      ? Math.round((subjectsWithMinGrades / totalSubjectsEvaluated) * 100)
      : 0;

  // Indicateur 9 : Taux de validation des émargements dans les délais (appels validés sur les cours passés de la période)
  const periodPastLessons = allRecentLessons.filter(
    (l) => l.endTime <= now && l.startTime >= periodStart
  );
  const validatedLessonsCount = periodPastLessons.filter((l) => l.isAttendanceValidated).length;
  const rollCallValidationRate =
    periodPastLessons.length > 0
      ? Math.round((validatedLessonsCount / periodPastLessons.length) * 100)
      : 100;

  // Indicateur 10 : Taux d'occupation des salles de cours
  const periodDays = Math.max(7, Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
  const totalOccupiedRoomHours = roomLessons.reduce(
    (acc, l) => acc + (l.endTime.getTime() - l.startTime.getTime()) / (1000 * 60 * 60),
    0
  );
  // Capacité hebdomadaire par salle estimée à 45h (du lundi au vendredi, 8h-17h)
  const roomCapacityHours = rooms.length * (periodDays / 7) * 45;
  const roomOccupancyRate =
    roomCapacityHours > 0
      ? Math.min(100, Math.round((totalOccupiedRoomHours / roomCapacityHours) * 100))
      : 0;

  // Indicateur 13 : Taux d'activation des comptes parents / responsables
  const allParents = allActiveUsers.filter((u) => u.role === "RESPONSIBLE");
  const activeParents = allParents.filter((u) => u.lastLoginAt != null).length;
  const parentActivationPct =
    allParents.length > 0 ? Math.round((activeParents / allParents.length) * 100) : 0;

  // Indicateur de connexion mensuelle active par type d'utilisateur
  const thirtyDaysAgo = subDays(now, 30);
  const ROLE_LABELS: Record<string, string> = {
    STUDENT: "Étudiants",
    TEACHER: "Formateurs",
    RESPONSIBLE: "Parents",
    COMPANY_TUTOR: "Tuteurs entreprise",
    ADMIN: "Administration",
  };

  const monthlyLoginsByRole = (["STUDENT", "TEACHER", "RESPONSIBLE", "COMPANY_TUTOR", "ADMIN"] as const).map(
    (role) => {
      const usersInRole = allActiveUsers.filter((u) => u.role === role);
      const total = usersInRole.length;
      const activeMonthly = usersInRole.filter(
        (u) => u.lastLoginAt && u.lastLoginAt >= thirtyDaysAgo
      ).length;
      const percentage = total > 0 ? Math.round((activeMonthly / total) * 100) : 0;
      return {
        role,
        label: ROLE_LABELS[role] ?? role,
        total,
        activeMonthly,
        percentage,
      };
    }
  );

  // Taux de présence et d'absentéisme des élèves sur la période cible
  const periodAttendances = attendances.filter(
    (a) => a.lesson.startTime >= periodStart,
  );

  // Présents ou Retards (l'élève était physiquement en cours)
  const presentCount = periodAttendances.filter(
    (a) => a.status === "PRESENT" || a.status === "LATE"
  ).length;

  // Absences justifiées / excusées (ne pénalisent pas l'assiduité réglementaire)
  const excusedCount = periodAttendances.filter((a) => a.status === "EXCUSED").length;

  // Absences injustifiées fermes (confirmées par admin ou ayant dépassé le délai de 48h)
  const unjustifiedCount = periodAttendances.filter(
    (a) => a.status === "ABSENT" && (a.isConfirmed || a.lesson.startTime < subDays(now, 2))
  ).length;

  const totalPeriodLessons = periodAttendances.length;

  // Taux d'assiduité réglementaire : (Présents + Excusés) / Total
  const attendanceRate =
    totalPeriodLessons > 0
      ? Math.round(((presentCount + excusedCount) / totalPeriodLessons) * 1000) / 10
      : 100;

  // Taux d'absentéisme injustifié (véritable décrochage)
  const unjustifiedAbsenceRate =
    totalPeriodLessons > 0
      ? Math.round((unjustifiedCount / totalPeriodLessons) * 1000) / 10
      : 0;

  // Pourcentage de livrets/bulletins déjà complétés
  const reportCardsPct =
    students.length > 0 && selectedSemesterId
      ? (reportCards.filter((rc) => studentIds.has(rc.studentId)).length / students.length) * 100
      : 0;

  // Pourcentage de compétences acquises (Niveau d'évaluation >= 3)
  const competencyAcquiredPct =
    evaluations.length > 0
      ? (evaluations.filter((e) => e.level >= 3).length / evaluations.length) * 100
      : 0;

  // Suivi des heures mensuelles (réalisées vs planifiées) pour les indicateurs RH (avec fusion des cours groupés par prof)
  const hrHoursProjected = calculateMergedTeacherHours(lessonsThisMonth);
  const hrHoursRealized = calculateMergedTeacherHours(
    lessonsThisMonth.filter((l) => l.endTime < now)
  );

  // Couverture de contrat d'alternance/stage des élèves
  const studentsWithContract = students.filter(
    (s) => s.studentContracts && s.studentContracts.length > 0
  ).length;
  const contractCoveragePct =
    students.length > 0 ? (studentsWithContract / students.length) * 100 : 0;

  // Pourcentage d'élèves ayant au moins un responsable légal lié en BDD
  const parentLinkPct =
    students.length > 0 ? (studentsWithParents.length / students.length) * 100 : 0;

  // Statistiques Qualiopi
  const openComplaintsList = complaints.filter((c) => c.status === "OPEN");
  const closedComplaints = complaints.filter((c) => c.status !== "OPEN").length;
  const satisfactionAvg =
    surveys.length > 0
      ? surveys.reduce((acc, s) => acc + s.rating, 0) / surveys.length
      : null;

  // 4. Statistiques par classe (Moyenne générale, assiduité réglementaire et absentéisme injustifié)
  const classStats = classes
    .filter((c) => !selectedClassId || c.id === selectedClassId)
    .map((cls) => {
      const classStudents = students.filter((s) => s.classId === cls.id);
      const classStudentIds = new Set(classStudents.map((s) => s.id));
      const classGrades = filteredGrades.filter((g) => classStudentIds.has(g.studentId));
      const avg = weightedAverage(classGrades);

      const classAtt = periodAttendances.filter((a) => classStudentIds.has(a.studentId));
      const classRegCount = classAtt.filter(
        (a) => a.status === "PRESENT" || a.status === "LATE" || a.status === "EXCUSED"
      ).length;
      const classUnjustifiedCount = classAtt.filter(
        (a) => a.status === "ABSENT" && (a.isConfirmed || a.lesson.startTime < subDays(now, 2))
      ).length;

      const classAttRate = classAtt.length > 0 ? Math.round((classRegCount / classAtt.length) * 1000) / 10 : 100;
      const classUnjustifiedRate = classAtt.length > 0 ? Math.round((classUnjustifiedCount / classAtt.length) * 1000) / 10 : 0;

      return {
        classId: cls.id,
        className: cls.name,
        average: avg,
        attendanceRate: classAttRate,
        unjustifiedRate: classUnjustifiedRate,
        studentCount: classStudents.length,
      };
    })
    .filter((c) => c.studentCount > 0);

  // Top 5 des meilleures classes en moyenne
  const topClasses = [...classStats]
    .filter((c) => c.average != null)
    .sort((a, b) => (b.average ?? 0) - (a.average ?? 0))
    .slice(0, 5)
    .map((c) => ({
      classId: c.classId,
      className: c.className,
      average: Math.round((c.average ?? 0) * 100) / 100,
    }));

  // Classes en difficulté (Absentéisme injustifié > 10% OU Assiduité réglementaire < 85% OU Moyenne < 10/20)
  // Les absences à justifier ou médicalement justifiées ne pénalisent plus injustement les classes !
  const atRiskClasses = classStats
    .filter((c) => c.unjustifiedRate > 10 || c.attendanceRate < 85 || (c.average != null && c.average < 10))
    .sort((a, b) => b.unjustifiedRate - a.unjustifiedRate || a.attendanceRate - b.attendanceRate)
    .slice(0, 5)
    .map((c) => ({
      classId: c.classId,
      className: c.className,
      attendanceRate: Math.round(c.attendanceRate),
      unjustifiedRate: Math.round(c.unjustifiedRate),
      average: c.average != null ? Math.round(c.average * 100) / 100 : null,
    }));

  // Veille Décrochage : Identification des élèves ayant des absences injustifiées répétées
  const studentUnjustifiedMap = new Map<string, number>();
  for (const a of periodAttendances) {
    if (a.status === "ABSENT" && (a.isConfirmed || a.lesson.startTime < subDays(now, 2))) {
      studentUnjustifiedMap.set(a.studentId, (studentUnjustifiedMap.get(a.studentId) ?? 0) + 1);
    }
  }

  const atRiskStudents = students
    .map((s) => {
      const count = studentUnjustifiedMap.get(s.id) ?? 0;
      return {
        id: s.id,
        studentName: formatStudentName(s.firstName, s.lastName),
        className: s.class?.name || "Sans classe",
        unjustifiedCount: count,
        conductPoints: s.conductPoints ?? 100,
      };
    })
    .filter((s) => s.unjustifiedCount >= 2 || s.conductPoints <= 50)
    .sort((a, b) => b.unjustifiedCount - a.unjustifiedCount || a.conductPoints - b.conductPoints)
    .slice(0, 6);

  // Extraction des compétences non acquises pour amélioration pédagogique (Qualiopi)
  const competencyMap = new Map<string, { total: number; acquired: number }>();
  for (const ev of evaluations) {
    const entry = competencyMap.get(ev.competency) ?? { total: 0, acquired: 0 };
    entry.total += 1;
    if (ev.level >= 3) entry.acquired += 1;
    competencyMap.set(ev.competency, entry);
  }
  const weakCompetencies = Array.from(competencyMap.entries())
    .map(([name, { total, acquired }]) => ({
      name,
      acquiredPct: Math.round((acquired / total) * 100),
      total,
    }))
    .filter((c) => c.acquiredPct < 60)
    .sort((a, b) => a.acquiredPct - b.acquiredPct)
    .slice(0, 5);

  // Distribution des sanctions pour graphiques administratifs
  const sanctionsByTypeMap = new Map<string, number>();
  for (const s of sanctions) {
    const name = s.sanctionType.name;
    sanctionsByTypeMap.set(name, (sanctionsByTypeMap.get(name) ?? 0) + 1);
  }
  const sanctionsByType = Array.from(sanctionsByTypeMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // Taux de présence hebdomadaire glissant sur 12 semaines avec ventilation réglementaire vs injustifié
  const attendanceWeekly: AdminDashboardPayload["charts"]["attendanceWeekly"] = [];
  for (let i = 11; i >= 0; i--) {
    const weekStart = startOfWeek(subDays(now, i * 7), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekAtt = attendances.filter(
      (a) => a.lesson.startTime >= weekStart && a.lesson.startTime <= weekEnd,
    );
    const total = weekAtt.length;
    const pres = weekAtt.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
    const exc = weekAtt.filter((a) => a.status === "EXCUSED").length;
    const pending = weekAtt.filter(
      (a) => a.status === "ABSENT" && !a.isConfirmed && a.lesson.startTime >= subDays(now, 2)
    ).length;
    const unj = weekAtt.filter(
      (a) => a.status === "ABSENT" && (a.isConfirmed || a.lesson.startTime < subDays(now, 2))
    ).length;

    const rate = total > 0 ? Math.round(((pres + exc) / total) * 100) : 100;
    const unjustifiedRate = total > 0 ? Math.round((unj / total) * 100) : 0;

    attendanceWeekly.push({
      week: format(weekStart, "d MMM", { locale: fr }),
      rate,
      unjustifiedRate,
      present: pres,
      excused: exc,
      unjustified: unj,
      pending,
    });
  }

  const classAverages = classStats
    .filter((c) => c.average != null)
    .map((c) => ({
      className: c.className,
      average: Math.round((c.average ?? 0) * 100) / 100,
    }))
    .sort((a, b) => b.average - a.average);

  // Analyse des heures programmées vs assurées sur 12 semaines pour les KPI RH
  const hrHoursWeekly: { week: string; planned: number; realized: number; gap: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const weekStart = startOfWeek(subDays(now, i * 7), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekLessons = allRecentLessons.filter(
      (l) => l.startTime >= weekStart && l.startTime <= weekEnd,
    );
    const planned = calculateMergedTeacherHours(weekLessons);
    const realized = calculateMergedTeacherHours(
      weekLessons.filter((l) => l.endTime < now)
    );
    hrHoursWeekly.push({
      week: format(weekStart, "d MMM", { locale: fr }),
      planned: Math.round(planned * 10) / 10,
      realized: Math.round(realized * 10) / 10,
      gap: Math.round((planned - realized) * 10) / 10,
    });
  }

  // Charge de cours cumulée par enseignant (heures réalisées vs planifiées à venir, avec fusion des cours groupés)
  const teacherLessonsMap = new Map<
    string,
    {
      name: string;
      realizedIntervals: { start: number; end: number }[];
      plannedIntervals: { start: number; end: number }[];
    }
  >();

  for (const lesson of annualLessonsForTeachers) {
    if (!lesson.teacherId || !lesson.teacher || lesson.isCancelled) continue;

    const name = formatTeacherName(lesson.teacher.firstName, lesson.teacher.lastName);

    let entry = teacherLessonsMap.get(lesson.teacherId);
    if (!entry) {
      entry = { name, realizedIntervals: [], plannedIntervals: [] };
      teacherLessonsMap.set(lesson.teacherId, entry);
    }

    const interval = { start: lesson.startTime.getTime(), end: lesson.endTime.getTime() };
    if (lesson.endTime < now) {
      entry.realizedIntervals.push(interval);
    } else {
      entry.plannedIntervals.push(interval);
    }
  }

  const teacherWorkloadByTeacher = Array.from(teacherLessonsMap.values())
    .map((t) => {
      const realized = calculateSingleTeacherMergedHours(t.realizedIntervals);
      const planned = calculateSingleTeacherMergedHours(t.plannedIntervals);
      const realizedRounded = Math.round(realized * 10) / 10;
      const plannedRounded = Math.round(planned * 10) / 10;
      const total = Math.round((realized + planned) * 10) / 10;
      const percentage = total > 0 ? Math.round((realized / total) * 100) : 0;
      return {
        teacherName: t.name || "Enseignant",
        realized: realizedRounded,
        planned: plannedRounded,
        total,
        percentage,
      };
    })
    .sort((a, b) => b.total - a.total);

  // Taux de présence global des professeurs (cours assurés / total planifié)
  const totalAnnualLessons = annualLessonsForTeachers.length;
  const cancelledLessons = annualLessonsForTeachers.filter((l) => l.isCancelled).length;
  const teacherAttendanceRate =
    totalAnnualLessons > 0
      ? Math.round(((totalAnnualLessons - cancelledLessons) / totalAnnualLessons) * 100)
      : 100;

  const ratingDistribution = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: surveys.filter((s) => s.rating === rating).length,
  }));

  const satisfactionMonthly: { month: string; avg: number; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const mStart = startOfMonth(subDays(now, i * 30));
    const label = format(mStart, "MMM yy", { locale: fr });
    satisfactionMonthly.push({ month: label, avg: satisfactionAvg ?? 0, count: surveys.length });
  }

  // Liste des contrats d'alternance qui arrivent à expiration sous 90 jours
  const expiringContracts = companyContracts
    .filter((c) => {
      const daysLeft = Math.ceil((c.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysLeft >= 0 && daysLeft <= 90 && (!selectedClassId || c.student.classId === selectedClassId);
    })
    .slice(0, 8)
    .map((c) => ({
      id: c.id,
      studentName: formatStudentName(c.student.firstName, c.student.lastName),
      companyName: c.companyName,
      endDate: c.endDate.toISOString(),
      daysLeft: Math.ceil((c.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }));

  const studentsWithoutParent = students.filter((s) => s.responsibles.length === 0).length;
  const studentsWithoutContract = students.filter((s) => s.studentContracts.length === 0).length;
  const missingReportCards =
    students.length > 0 && selectedSemesterId
      ? students.length - reportCards.filter((rc) => studentIds.has(rc.studentId)).length
      : 0;

  // 5. Génération dynamique des alertes système
  const alerts: AdminAlert[] = [];
  if (pendingRollCalls > 0) {
    alerts.push({
      id: "roll-calls",
      severity: "critical",
      label: "Appels non validés",
      count: pendingRollCalls,
      href: "/admin/absences",
    });
  }
  if (overdueAbsencesCount > 0) {
    alerts.push({
      id: "overdue-absences",
      severity: "critical",
      label: "Absences injustifiées hors délai (> 48h)",
      count: overdueAbsencesCount,
      href: "/admin/absences?status=UNCONFIRMED",
    });
  }
  if (pendingJustificationsCount > 0) {
    alerts.push({
      id: "pending-justifications",
      severity: "info",
      label: "Absences à justifier en cours (< 48h)",
      count: pendingJustificationsCount,
      href: "/admin/absences?status=UNCONFIRMED",
    });
  }
  if (missingReportCards > 0) {
    alerts.push({
      id: "report-cards",
      severity: "warning",
      label: "Bulletins manquants",
      count: missingReportCards,
      href: "/admin/recap/report-cards",
    });
  }
  if (pendingSubstitutions > 0) {
    alerts.push({
      id: "substitutions",
      severity: "warning",
      label: "Remplacements en attente",
      count: pendingSubstitutions,
      href: "/admin/substitutions",
    });
  }
  if (pendingMeetings > 0) {
    alerts.push({
      id: "meetings",
      severity: "info",
      label: "Réunions à planifier",
      count: pendingMeetings,
      href: "/admin",
    });
  }
  if (expiringContracts.length > 0) {
    alerts.push({
      id: "contracts",
      severity: "warning",
      label: "Contrats expirant (< 90j)",
      count: expiringContracts.length,
      href: "/admin/relations/contracts",
    });
  }
  if (conductAtRisk > 0) {
    alerts.push({
      id: "conduct",
      severity: "critical",
      label: "Élèves ≤ 50 pts conduite",
      count: conductAtRisk,
      href: "/admin/sanctions",
    });
  }
  if (studentsWithoutParent > 0) {
    alerts.push({
      id: "parents",
      severity: "info",
      label: "Élèves sans parent lié",
      count: studentsWithoutParent,
      href: "/admin/recap",
    });
  }
  if (studentsWithoutContract > 0) {
    alerts.push({
      id: "no-contract",
      severity: "warning",
      label: "Élèves sans contrat actif",
      count: studentsWithoutContract,
      href: "/admin/relations/contracts",
    });
  }
  if (qualiopiEnabled && openComplaintsList.length > 0) {
    alerts.push({
      id: "complaints",
      severity: "warning",
      label: "Réclamations ouvertes",
      count: openComplaintsList.length,
      href: "/admin/qualiopi",
    });
  }

  // 6. Assemblage et retour du Payload
  return {
    schoolName,
    qualiopiEnabled,
    filterOptions: {
      semesters: semesters.map((s) => ({
        id: s.id,
        name: s.name,
        schoolYear: s.schoolYear?.name ?? null,
      })),
      classes,
      selectedSemesterId,
      selectedClassId,
      selectedPeriod: period,
    },
    alerts,
    kpis: {
      students: studentsCount,
      teachers: teachersCount,
      classes: classesCount,
      attendanceRate: Math.round(attendanceRate),
      unjustifiedAbsenceRate: Math.round(unjustifiedAbsenceRate),
      pendingJustifications: pendingJustificationsCount,
      overdueAbsences: overdueAbsencesCount,
      generalAverage: generalAverage != null ? Math.round(generalAverage * 100) / 100 : null,
      gradeStdDev,
      gradeCompletionPct,
      rollCallValidationRate,
      roomOccupancyRate,
      parentActivationPct,
      sanctionsCount: sanctions.length,
      reportCardsPct: Math.round(reportCardsPct),
      competencyAcquiredPct: Math.round(competencyAcquiredPct),
      hrHoursRealized: Math.round(hrHoursRealized * 10) / 10,
      hrHoursProjected: Math.round(hrHoursProjected * 10) / 10,
      hrRealizationRate: hrHoursProjected > 0 ? Math.min(100, Math.round((hrHoursRealized / hrHoursProjected) * 100)) : 0,
      contractCoveragePct: Math.round(contractCoveragePct),
      parentLinkPct: Math.round(parentLinkPct),
      satisfactionAvg: qualiopiEnabled && satisfactionAvg != null ? Math.round(satisfactionAvg * 10) / 10 : null,
      openComplaints: qualiopiEnabled ? openComplaintsList.length : 0,
      pendingRollCalls,
      teacherAttendanceRate,
    },
    monthlyLoginsByRole,
    charts: {
      attendanceWeekly,
      classAverages,
      sanctionsByType,
      hrHoursWeekly,
      satisfactionMonthly: qualiopiEnabled ? satisfactionMonthly : [],
      teacherWorkloadByTeacher,
    },
    miniTables: {
      topClasses,
      atRiskClasses,
      atRiskStudents,
      weakCompetencies,
      recentDisciplineEvents: disciplineEvents.map((e) => ({
        id: e.id,
        type: e.type,
        description: e.description,
        studentName: formatStudentName(e.student.firstName, e.student.lastName),
        createdAt: e.createdAt.toISOString(),
      })),
      expiringContracts,
    },
    qualiopi: qualiopiEnabled
      ? {
          openComplaints: openComplaintsList.length,
          closedComplaints,
          satisfactionAvg,
          satisfactionCount: surveys.length,
          recentComplaints: complaints.slice(0, 6).map((c) => ({
            id: c.id,
            subject: c.subject,
            status: c.status,
            createdAt: c.createdAt.toISOString(),
            senderName: formatUserName(c.sender.firstName, c.sender.lastName, "Un usager"),
          })),
          ratingDistribution,
        }
      : {
          openComplaints: 0,
          closedComplaints: 0,
          satisfactionAvg: null,
          satisfactionCount: 0,
          recentComplaints: [],
          ratingDistribution: [1, 2, 3, 4, 5].map((rating) => ({ rating, count: 0 })),
        },
    pendingActions: {
      pendingMeetings,
      pendingSubstitutions,
    },
  };
}

/**
 * Charge le payload du tableau de bord administrateur en utilisant le cache Next.js (unstable_cache).
 * Permet d'éviter de saturer la base de données PostgreSQL lors de rechargements rapprochés (TTL 60s).
 */
export async function loadAdminDashboardPayload(
  filters: AdminDashboardFilters = {},
): Promise<AdminDashboardPayload> {
  const semesterKey = filters.semesterId ?? "current";
  const classKey = filters.classId ?? "all";
  const periodKey = filters.period ?? "30d";

  const getCachedPayload = unstable_cache(
    async () => calculateAdminDashboardPayload(filters),
    ["admin-dashboard-payload", semesterKey, classKey, periodKey],
    {
      revalidate: 60,
      tags: ["admin-dashboard"],
    }
  );

  return getCachedPayload();
}
