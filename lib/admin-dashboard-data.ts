import prisma from "@/lib/prisma";
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
    attendanceRate: number;
    generalAverage: number | null;
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
  charts: {
    attendanceWeekly: { week: string; rate: number }[];
    classAverages: { className: string; average: number }[];
    sanctionsByType: { type: string; count: number }[];
    hrHoursWeekly: { week: string; planned: number; realized: number; gap: number }[];
    satisfactionMonthly: { month: string; avg: number; count: number }[];
    teacherWorkloadByTeacher: { teacherName: string; realized: number; planned: number }[];
  };
  miniTables: {
    topClasses: { classId: string; className: string; average: number }[];
    atRiskClasses: { classId: string; className: string; attendanceRate: number; average: number | null }[];
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
export async function loadAdminDashboardPayload(
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
    globalSettings.find((s) => s.key === QUALIOPI_ENABLED_KEY)?.value !== "false";

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

  // 2. Agrégation des données de base en parallèle (KPIs, absences, notes, sanctions)
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
    conductAtRisk,
    annualLessonsForTeachers,
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
        grades: selectedSemesterId
          ? { where: { semesterId: selectedSemesterId } }
          : true,
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
      include: {
        student: { select: { id: true, firstName: true, lastName: true, classId: true } },
      },
      orderBy: { endDate: "asc" },
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
  ]);

  // 3. Calculs des KPIs principaux
  const studentIds = new Set(students.map((s) => s.id));
  const filteredGrades = grades.filter((g) => studentIds.has(g.studentId));

  // Calcul de la moyenne générale de l'école ou de la classe filtrée
  const generalAverage = weightedAverage(filteredGrades);

  // Taux de présence des élèves sur la période cible
  const periodAttendances = attendances.filter(
    (a) => a.lesson.startTime >= periodStart,
  );
  const presentCount = periodAttendances.filter((a) => a.status === "PRESENT").length;
  const attendanceRate =
    periodAttendances.length > 0
      ? (presentCount / periodAttendances.length) * 100
      : 100;

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
  const activeContracts = companyContracts.filter(
    (c) => c.endDate >= now && studentIds.has(c.studentId),
  );
  const contractCoveragePct =
    students.length > 0 ? (activeContracts.length / students.length) * 100 : 0;

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

  // 4. Statistiques par classe (Moyenne générale et présence)
  const classStats = classes
    .filter((c) => !selectedClassId || c.id === selectedClassId)
    .map((cls) => {
      const classStudents = students.filter((s) => s.classId === cls.id);
      const classStudentIds = new Set(classStudents.map((s) => s.id));
      const classGrades = filteredGrades.filter((g) => classStudentIds.has(g.studentId));
      const avg = weightedAverage(classGrades);

      const classAtt = periodAttendances.filter((a) => classStudentIds.has(a.studentId));
      const classPresent = classAtt.filter((a) => a.status === "PRESENT").length;
      const classAttRate = classAtt.length > 0 ? (classPresent / classAtt.length) * 100 : 100;

      return {
        classId: cls.id,
        className: cls.name,
        average: avg,
        attendanceRate: classAttRate,
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

  // Classes en difficulté (Présence < 85% ou Moyenne < 10/20)
  const atRiskClasses = classStats
    .filter((c) => c.attendanceRate < 85 || (c.average != null && c.average < 10))
    .sort((a, b) => a.attendanceRate - b.attendanceRate)
    .slice(0, 5)
    .map((c) => ({
      classId: c.classId,
      className: c.className,
      attendanceRate: Math.round(c.attendanceRate),
      average: c.average != null ? Math.round(c.average * 100) / 100 : null,
    }));

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

  // Taux de présence hebdomadaire glissant sur 12 semaines
  const attendanceWeekly: { week: string; rate: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const weekStart = startOfWeek(subDays(now, i * 7), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekAtt = attendances.filter(
      (a) => a.lesson.startTime >= weekStart && a.lesson.startTime <= weekEnd,
    );
    const weekPresent = weekAtt.filter((a) => a.status === "PRESENT").length;
    attendanceWeekly.push({
      week: format(weekStart, "d MMM", { locale: fr }),
      rate: weekAtt.length > 0 ? Math.round((weekPresent / weekAtt.length) * 100) : 100,
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
  const allRecentLessons = await prisma.lesson.findMany({
    where: {
      startTime: { gte: subDays(now, 84) },
      isCancelled: false,
    },
    select: { startTime: true, endTime: true, teacherId: true },
  });
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

    const teacherId = lesson.teacherId;
    const name = `${lesson.teacher.lastName ?? ""} ${lesson.teacher.firstName ?? ""}`.trim();

    let entry = teacherLessonsMap.get(teacherId);
    if (!entry) {
      entry = { name, realizedIntervals: [], plannedIntervals: [] };
      teacherLessonsMap.set(teacherId, entry);
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
      return {
        teacherName: t.name,
        realized: Math.round(realized * 10) / 10,
        planned: Math.round(planned * 10) / 10,
      };
    })
    .sort((a, b) => b.realized + b.planned - (a.realized + a.planned));

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
      studentName: `${c.student.lastName ?? ""} ${c.student.firstName ?? ""}`.trim(),
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
      generalAverage: generalAverage != null ? Math.round(generalAverage * 100) / 100 : null,
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
      weakCompetencies,
      recentDisciplineEvents: disciplineEvents.map((e) => ({
        id: e.id,
        type: e.type,
        description: e.description,
        studentName: `${e.student.lastName ?? ""} ${e.student.firstName ?? ""}`.trim(),
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
            senderName: `${c.sender.lastName ?? ""} ${c.sender.firstName ?? ""}`.trim(),
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
