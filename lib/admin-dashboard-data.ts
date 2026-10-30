import prisma from "@/lib/prisma";
import { formatTeacherName, formatStudentName, formatUserName } from "@/lib/user-utils";
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
    roomOccupancyRate: number; // Indicateur 10 : Taux d'occupation global des salles
    totalOccupiedRoomHours: number; // Volume total d'heures occupées en salle
    totalAvailableRoomHours: number; // Capacité totale d'heures en salle
    courseContentFillRate: number; // Taux de remplissage des contenus de cours (Cahier de texte)
    missingContentCount: number; // Cours passés sans résumé/contenu saisi
    totalPastLessonsCount: number; // Total cours passés
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
    hrHoursWeekly: {
      week: string;
      planned: number;
      realized: number;
      gap: number;
      isInconsistent: boolean;
      inconsistencyType: "deficit" | "surplus" | "none";
      cancelledCount: number;
    }[];
    satisfactionMonthly: { month: string; avg: number; count: number }[];
    teacherWorkloadByTeacher: {
      teacherName: string;
      realized: number;
      planned: number;
      total: number;
      percentage: number;
    }[];
    roomOccupancyByRoom: {
      roomId: string;
      roomName: string;
      capacity: number | null;
      occupiedHours: number;
      availableHours: number;
      occupancyRate: number;
    }[];
    roomOccupancyWeekly: {
      week: string;
      occupiedHours: number;
      occupancyRate: number;
    }[];
    courseContentWeekly: {
      week: string;
      totalLessons: number;
      withContent: number;
      fillRate: number;
    }[];
    courseContentBySubject: {
      subjectName: string;
      total: number;
      filled: number;
      fillRate: number;
    }[];
    attendanceDistribution: {
      name: string;
      count: number;
      percentage: number;
      color: string;
    }[];
    gradeDistribution: {
      bracket: string;
      label: string;
      count: number;
      percentage: number;
      color: string;
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
    teachersMissingContent: {
      teacherId: string;
      teacherName: string;
      missingCount: number;
      totalLessons: number;
      fillRate: number;
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
export async function calculateAdminDashboardPayload(
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
    prisma.globalSetting.findMany(),
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

  // Détermine la période / semestre précédent pour les alertes sur les livrables périodiques (bulletins de notes)
  const previousSemester =
    semesters
      .filter(
        (s) =>
          s.id !== (selectedSemester?.id ?? selectedSemesterId) &&
          (selectedSemester ? s.endDate <= selectedSemester.startDate : s.endDate <= now),
      )
      .sort((a, b) => b.endDate.getTime() - a.endDate.getTime())[0] ??
    (() => {
      const sortedByStart = [...semesters].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      const idx = sortedByStart.findIndex((s) => s.id === (selectedSemester?.id ?? selectedSemesterId));
      return idx > 0 ? sortedByStart[idx - 1] : null;
    })();

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

  // 2. Agrégation des données par lots (optimisation du pool de connexions PgBouncer)
  const classesCount = classes.length;

  // Lot A : Scolarité, notes, assiduité et évaluations
  const [
    teachersCount,
    students,
    grades,
    attendances,
    reportCards,
    evaluations,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "TEACHER", isActive: true } }),
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
        ...(selectedClassId ? { student: { classId: selectedClassId } } : {}),
      },
      select: {
        status: true,
        isConfirmed: true,
        lesson: { select: { startTime: true, endTime: true } },
        studentId: true,
      },
    }),
    selectedSemesterId || previousSemester?.id
      ? prisma.reportCard.findMany({
          where: {
            semesterId: {
              in: Array.from(
                new Set([selectedSemesterId, previousSemester?.id].filter((id): id is string => Boolean(id))),
              ),
            },
          },
        })
      : Promise.resolve([]),
    prisma.evaluation.findMany({
      where: selectedSemesterId ? { semesterId: selectedSemesterId } : undefined,
      select: { competency: true, level: true },
    }),
  ]);

  const studentsCount = students.length;
  const conductAtRisk = students.filter((s) => (s.conductPoints ?? 100) <= 50).length;
  const twoDaysAgo = subDays(now, 2);
  const unconfirmedAbsences = attendances.filter((a) => a.status === "ABSENT" && !a.isConfirmed);
  const pendingJustificationsCount = unconfirmedAbsences.filter((a) => a.lesson.startTime >= twoDaysAgo).length;
  const overdueAbsencesCount = unconfirmedAbsences.filter((a) => a.lesson.startTime < twoDaysAgo).length;

  // Lot B : Emploi du temps, charge annuelle professeurs et occupation des salles
  const [
    annualLessonsForTeachers,
    allRecentLessons,
    allSubjects,
    rooms,
    roomLessons,
    periodLessonsForContent,
    pendingRollCalls,
    lessonsThisMonth,
  ] = await Promise.all([
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
    prisma.lesson.findMany({
      where: {
        startTime: { gte: subDays(now, 84) },
      },
      select: { startTime: true, endTime: true, teacherId: true, isCancelled: true, isAttendanceValidated: true },
    }),
    prisma.subject.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.room.findMany({
      select: { id: true, name: true, capacity: true },
    }),
    prisma.lesson.findMany({
      where: {
        startTime: { gte: periodStart },
        endTime: { lte: now },
        isCancelled: false,
        roomId: { not: null },
      },
      select: { startTime: true, endTime: true, roomId: true },
    }),
    prisma.lesson.findMany({
      where: {
        startTime: { gte: periodStart },
        endTime: { lte: now },
        isCancelled: false,
        ...(selectedClassId ? { classId: selectedClassId } : {}),
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        summary: true,
        homework: true,
        subjectId: true,
        subject: { select: { id: true, name: true } },
        teacherId: true,
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.lesson.count({
      where: {
        startTime: { lt: now },
        isCancelled: false,
        isAttendanceValidated: false,
      },
    }),
    prisma.lesson.findMany({
      where: {
        startTime: { gte: monthStart },
        endTime: { lte: monthEnd },
        isCancelled: false,
      },
      select: { startTime: true, endTime: true, teacherId: true },
    }),
  ]);

  // Lot C : Contrats alternance, vie scolaire, gouvernance et Qualiopi
  const [
    companyContracts,
    disciplineEvents,
    complaints,
    surveys,
    pendingMeetings,
    pendingSubstitutions,
    allActiveUsers,
    sanctions,
  ] = await Promise.all([
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
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, role: true, lastLoginAt: true },
    }),
    prisma.sanction.findMany({
      where: {
        date: { gte: periodStart },
        ...(selectedClassId ? { student: { classId: selectedClassId } } : {}),
      },
      include: { sanctionType: { select: { name: true } } },
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

  // Indicateur 9 : Taux de validation des émargements dans les délais (appels validés sur les cours passés de la période, hors cours annulés)
  const periodPastLessons = allRecentLessons.filter(
    (l) => l.endTime <= now && l.startTime >= periodStart && !l.isCancelled
  );
  const validatedLessonsCount = periodPastLessons.filter((l) => l.isAttendanceValidated).length;
  const rollCallValidationRate =
    periodPastLessons.length > 0
      ? Math.round((validatedLessonsCount / periodPastLessons.length) * 100)
      : 100;

  // Indicateur 10 : Taux d'occupation des salles de cours sur la période / semestre
  const periodDays = Math.max(7, Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
  const totalOccupiedRoomHours = Math.round(
    roomLessons.reduce(
      (acc, l) => acc + (l.endTime.getTime() - l.startTime.getTime()) / (1000 * 60 * 60),
      0
    ) * 10
  ) / 10;
  // Capacité hebdomadaire par salle estimée à 45h (du lundi au vendredi, 8h-17h)
  const roomAvailableHours = Math.max(1, Math.round((periodDays / 7) * 45));
  const totalAvailableRoomHours = rooms.length * roomAvailableHours;
  const roomOccupancyRate =
    totalAvailableRoomHours > 0
      ? Math.min(100, Math.round((totalOccupiedRoomHours / totalAvailableRoomHours) * 100))
      : 0;

  // Calcul du taux d'occupation individuel par salle
  const roomOccupancyMap = new Map<string, number>();
  for (const l of roomLessons) {
    if (l.roomId) {
      const dur = (l.endTime.getTime() - l.startTime.getTime()) / (1000 * 60 * 60);
      roomOccupancyMap.set(l.roomId, (roomOccupancyMap.get(l.roomId) ?? 0) + dur);
    }
  }

  const roomOccupancyByRoom = rooms
    .map((r) => {
      const hours = Math.round((roomOccupancyMap.get(r.id) ?? 0) * 10) / 10;
      const rate = Math.min(100, Math.round((hours / roomAvailableHours) * 100));
      return {
        roomId: r.id,
        roomName: r.name,
        capacity: r.capacity,
        occupiedHours: hours,
        availableHours: roomAvailableHours,
        occupancyRate: rate,
      };
    })
    .sort((a, b) => b.occupancyRate - a.occupancyRate);

  // Évolution de l'occupation des salles sur 12 semaines
  const roomOccupancyWeekly: { week: string; occupiedHours: number; occupancyRate: number }[] = [];
  const weeklyAvailableCapacity = rooms.length * 45;
  for (let i = 11; i >= 0; i--) {
    const weekStart = startOfWeek(subDays(now, i * 7), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekLessons = roomLessons.filter((l) => l.startTime >= weekStart && l.startTime <= weekEnd);
    const hours = Math.round(
      weekLessons.reduce(
        (acc, l) => acc + (l.endTime.getTime() - l.startTime.getTime()) / (1000 * 60 * 60),
        0
      ) * 10
    ) / 10;
    const rate = weeklyAvailableCapacity > 0 ? Math.min(100, Math.round((hours / weeklyAvailableCapacity) * 100)) : 0;
    roomOccupancyWeekly.push({
      week: format(weekStart, "d MMM", { locale: fr }),
      occupiedHours: hours,
      occupancyRate: rate,
    });
  }

  // Taux de remplissage des contenus de cours (Cahier de texte)
  const totalPastLessonsCount = periodLessonsForContent.length;
  const lessonsWithContent = periodLessonsForContent.filter(
    (l) => l.summary && l.summary.trim().length > 0
  );
  const lessonsWithContentCount = lessonsWithContent.length;
  const missingContentCount = totalPastLessonsCount - lessonsWithContentCount;
  const courseContentFillRate =
    totalPastLessonsCount > 0
      ? Math.round((lessonsWithContentCount / totalPastLessonsCount) * 100)
      : 100;

  // Évolution hebdomadaire du remplissage du cahier de texte (12 semaines)
  const courseContentWeekly: { week: string; totalLessons: number; withContent: number; fillRate: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const weekStart = startOfWeek(subDays(now, i * 7), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekLessons = periodLessonsForContent.filter((l) => l.startTime >= weekStart && l.startTime <= weekEnd);
    const withCont = weekLessons.filter((l) => l.summary && l.summary.trim().length > 0).length;
    const tot = weekLessons.length;
    const rate = tot > 0 ? Math.round((withCont / tot) * 100) : 100;
    courseContentWeekly.push({
      week: format(weekStart, "d MMM", { locale: fr }),
      totalLessons: tot,
      withContent: withCont,
      fillRate: rate,
    });
  }

  // Remplissage par matière
  const subjectContentMap = new Map<string, { total: number; filled: number }>();
  for (const l of periodLessonsForContent) {
    const subName = l.subject?.name || "Sans matière";
    const entry = subjectContentMap.get(subName) ?? { total: 0, filled: 0 };
    entry.total += 1;
    if (l.summary && l.summary.trim().length > 0) entry.filled += 1;
    subjectContentMap.set(subName, entry);
  }
  const courseContentBySubject = Array.from(subjectContentMap.entries())
    .map(([subjectName, data]) => ({
      subjectName,
      total: data.total,
      filled: data.filled,
      fillRate: data.total > 0 ? Math.round((data.filled / data.total) * 100) : 100,
    }))
    .sort((a, b) => a.fillRate - b.fillRate)
    .slice(0, 10);

  // Formateurs avec contenus manquants (pour relance ciblée)
  const teacherContentMap = new Map<string, { name: string; total: number; filled: number }>();
  for (const l of periodLessonsForContent) {
    if (!l.teacherId || !l.teacher) continue;
    const tName = formatTeacherName(l.teacher.firstName, l.teacher.lastName);
    const entry = teacherContentMap.get(l.teacherId) ?? { name: tName, total: 0, filled: 0 };
    entry.total += 1;
    if (l.summary && l.summary.trim().length > 0) entry.filled += 1;
    teacherContentMap.set(l.teacherId, entry);
  }
  const teachersMissingContent = Array.from(teacherContentMap.entries())
    .map(([teacherId, data]) => ({
      teacherId,
      teacherName: data.name,
      missingCount: data.total - data.filled,
      totalLessons: data.total,
      fillRate: data.total > 0 ? Math.round((data.filled / data.total) * 100) : 100,
    }))
    .filter((t) => t.missingCount > 0)
    .sort((a, b) => b.missingCount - a.missingCount)
    .slice(0, 8);

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

  // Répartition globale de l'assiduité pour graphique camembert
  const rawPresent = periodAttendances.filter((a) => a.status === "PRESENT").length;
  const rawLate = periodAttendances.filter((a) => a.status === "LATE").length;
  const rawExcused = periodAttendances.filter((a) => a.status === "EXCUSED").length;
  const rawUnjustified = periodAttendances.filter((a) => a.status === "ABSENT").length;
  const totalAtt = periodAttendances.length;

  const attendanceDistribution = [
    { name: "Présents", count: rawPresent, percentage: totalAtt > 0 ? Math.round((rawPresent / totalAtt) * 100) : 0, color: "#10b981" },
    { name: "Retards", count: rawLate, percentage: totalAtt > 0 ? Math.round((rawLate / totalAtt) * 100) : 0, color: "#f59e0b" },
    { name: "Excusés", count: rawExcused, percentage: totalAtt > 0 ? Math.round((rawExcused / totalAtt) * 100) : 0, color: "#3b82f6" },
    { name: "Injustifiés", count: rawUnjustified, percentage: totalAtt > 0 ? Math.round((rawUnjustified / totalAtt) * 100) : 0, color: "#ef4444" },
  ];

  // Répartition des notes par tranches de niveau pour graphique camembert / barres
  const totalGrades = filteredGrades.length;
  const gradeDistribution = [
    {
      bracket: "< 8",
      label: "Insuffisant (< 8)",
      count: filteredGrades.filter((g) => g.value < 8).length,
      percentage: totalGrades > 0 ? Math.round((filteredGrades.filter((g) => g.value < 8).length / totalGrades) * 100) : 0,
      color: "#ef4444",
    },
    {
      bracket: "8 - 10",
      label: "Fragile (8 - 10)",
      count: filteredGrades.filter((g) => g.value >= 8 && g.value < 10).length,
      percentage: totalGrades > 0 ? Math.round((filteredGrades.filter((g) => g.value >= 8 && g.value < 10).length / totalGrades) * 100) : 0,
      color: "#f97316",
    },
    {
      bracket: "10 - 12",
      label: "Moyen (10 - 12)",
      count: filteredGrades.filter((g) => g.value >= 10 && g.value < 12).length,
      percentage: totalGrades > 0 ? Math.round((filteredGrades.filter((g) => g.value >= 10 && g.value < 12).length / totalGrades) * 100) : 0,
      color: "#eab308",
    },
    {
      bracket: "12 - 14",
      label: "Satisfaisant (12 - 14)",
      count: filteredGrades.filter((g) => g.value >= 12 && g.value < 14).length,
      percentage: totalGrades > 0 ? Math.round((filteredGrades.filter((g) => g.value >= 12 && g.value < 14).length / totalGrades) * 100) : 0,
      color: "#3b82f6",
    },
    {
      bracket: "14 - 16",
      label: "Bien (14 - 16)",
      count: filteredGrades.filter((g) => g.value >= 14 && g.value < 16).length,
      percentage: totalGrades > 0 ? Math.round((filteredGrades.filter((g) => g.value >= 14 && g.value < 16).length / totalGrades) * 100) : 0,
      color: "#6366f1",
    },
    {
      bracket: "≥ 16",
      label: "Très bien (≥ 16)",
      count: filteredGrades.filter((g) => g.value >= 16).length,
      percentage: totalGrades > 0 ? Math.round((filteredGrades.filter((g) => g.value >= 16).length / totalGrades) * 100) : 0,
      color: "#10b981",
    },
  ];

  // Pourcentage de livrets/bulletins déjà complétés (période sélectionnée)
  const currentSemesterReportCards = selectedSemesterId
    ? reportCards.filter((rc) => rc.semesterId === selectedSemesterId)
    : [];
  const reportCardsPct =
    students.length > 0 && selectedSemesterId
      ? (currentSemesterReportCards.filter((rc) => studentIds.has(rc.studentId)).length / students.length) * 100
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
  const studentsWithParentsCount = students.filter(
    (s) => s.responsibles && s.responsibles.length > 0
  ).length;
  const parentLinkPct =
    students.length > 0 ? (studentsWithParentsCount / students.length) * 100 : 0;

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

  // Veille Décrochage : Identification des élèves ayant des absences injustifiées répétées (au moins 5 élèves)
  const studentUnjustifiedMap = new Map<string, number>();
  for (const a of periodAttendances) {
    if (a.status === "ABSENT" && (a.isConfirmed || a.lesson.startTime < subDays(now, 2))) {
      studentUnjustifiedMap.set(a.studentId, (studentUnjustifiedMap.get(a.studentId) ?? 0) + 1);
    }
  }

  const allMappedStudents = students
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
    .sort((a, b) => b.unjustifiedCount - a.unjustifiedCount || a.conductPoints - b.conductPoints);

  // Filtrer les élèves ayant des absences injustifiées ou des points de conduite impactés
  const prioritizedAtRisk = allMappedStudents.filter((s) => s.unjustifiedCount >= 1 || s.conductPoints < 100);
  // S'assurer de renvoyer au moins 5 élèves (jusqu'à 10) pour la veille décrochage
  const atRiskStudents = (
    prioritizedAtRisk.length >= 5
      ? prioritizedAtRisk
      : Array.from(new Map([...prioritizedAtRisk, ...allMappedStudents].map((s) => [s.id, s])).values())
  ).slice(0, 10);

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
    const name = s.sanctionType?.name || "Sanction";
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
  const hrHoursWeekly: AdminDashboardPayload["charts"]["hrHoursWeekly"] = [];
  for (let i = 11; i >= 0; i--) {
    const weekStart = startOfWeek(subDays(now, i * 7), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekLessons = allRecentLessons.filter(
      (l) => l.startTime >= weekStart && l.startTime <= weekEnd,
    );
    const isPastWeek = weekEnd < now;
    const isCurrentWeek = weekStart <= now && weekEnd >= now;

    // Heures programmées totales à l'emploi du temps
    const planned = calculateMergedTeacherHours(weekLessons);
    // Heures effectivement assurées (non annulées et créneau terminé)
    const realized = calculateMergedTeacherHours(
      weekLessons.filter((l) => !l.isCancelled && l.endTime < now),
    );

    const cancelledCount = weekLessons.filter((l) => l.isCancelled).length;
    const gap = Math.round((planned - realized) * 10) / 10;

    let isInconsistent = false;
    let inconsistencyType: "deficit" | "surplus" | "none" = "none";

    if (isPastWeek && planned > 0) {
      if (gap > 0.1 || cancelledCount > 0) {
        isInconsistent = true;
        inconsistencyType = "deficit";
      } else if (gap < -0.1) {
        isInconsistent = true;
        inconsistencyType = "surplus";
      }
    } else if (isCurrentWeek) {
      const pastLessonsThisWeek = weekLessons.filter((l) => l.endTime < now);
      const plannedSoFar = calculateMergedTeacherHours(pastLessonsThisWeek);
      const realizedSoFar = calculateMergedTeacherHours(
        pastLessonsThisWeek.filter((l) => !l.isCancelled),
      );
      if (plannedSoFar - realizedSoFar > 0.1 || cancelledCount > 0) {
        isInconsistent = true;
        inconsistencyType = "deficit";
      } else if (realized > planned + 0.1) {
        isInconsistent = true;
        inconsistencyType = "surplus";
      }
    }

    hrHoursWeekly.push({
      week: format(weekStart, "d MMM", { locale: fr }),
      planned: Math.round(planned * 10) / 10,
      realized: Math.round(realized * 10) / 10,
      gap,
      isInconsistent,
      inconsistencyType,
      cancelledCount,
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
      return daysLeft >= 0 && daysLeft <= 90 && (!selectedClassId || c.student?.classId === selectedClassId);
    })
    .slice(0, 8)
    .map((c) => ({
      id: c.id,
      studentName: c.student ? formatStudentName(c.student.firstName, c.student.lastName) : "Étudiant",
      companyName: c.companyName,
      endDate: c.endDate.toISOString(),
      daysLeft: Math.ceil((c.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }));

  const studentsWithoutParent = students.filter((s) => s.responsibles.length === 0).length;
  const studentsWithoutContract = students.filter((s) => s.studentContracts.length === 0).length;
  const previousSemesterReportCards = previousSemester
    ? reportCards.filter((rc) => rc.semesterId === previousSemester.id)
    : [];
  const missingPreviousReportCards =
    students.length > 0 && previousSemester
      ? students.length - previousSemesterReportCards.filter((rc) => studentIds.has(rc.studentId)).length
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
  if (missingPreviousReportCards > 0 && previousSemester) {
    alerts.push({
      id: "report-cards",
      severity: "warning",
      label: `Bulletins manquants (${previousSemester.name})`,
      count: missingPreviousReportCards,
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
  if (missingContentCount > 0) {
    alerts.push({
      id: "missing-content",
      severity: missingContentCount > 10 ? "warning" : "info",
      label: "Cours sans cahier de texte",
      count: missingContentCount,
      href: "/admin/devoirs?tab=missing",
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
      totalOccupiedRoomHours,
      totalAvailableRoomHours,
      courseContentFillRate,
      missingContentCount,
      totalPastLessonsCount,
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
      roomOccupancyByRoom,
      roomOccupancyWeekly,
      courseContentWeekly,
      courseContentBySubject,
      attendanceDistribution,
      gradeDistribution,
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
        studentName: e.student ? formatStudentName(e.student.firstName, e.student.lastName) : "Élève",
        createdAt: e.createdAt.toISOString(),
      })),
      expiringContracts,
      teachersMissingContent,
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
            senderName: c.sender ? formatUserName(c.sender.firstName, c.sender.lastName, "Un usager") : "Un usager",
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
 * Charge le payload du tableau de bord administrateur.
 * Exécute l'agrégation en parallèle avec gestion d'erreurs pour garantir la fiabilité du rendu Server Component.
 */
export async function loadAdminDashboardPayload(
  filters: AdminDashboardFilters = {},
): Promise<AdminDashboardPayload> {
  try {
    return await calculateAdminDashboardPayload(filters);
  } catch (error) {
    console.error("[AdminDashboard] Erreur lors du chargement du payload:", error);
    throw error;
  }
}
