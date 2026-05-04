import prisma from "@/lib/prisma";
import type { DashboardChartRow } from "@/app/student/dashboard/dashboard-client";
import type { DashboardClientProps } from "@/app/student/dashboard/dashboard-client";

export type DashboardBuildPayload = Omit<
  DashboardClientProps,
  "absencesDetailHref"
>;

type GradeLite = { value: number; coefficient: number };

function weightedAverage(grades: GradeLite[]): number | null {
  if (grades.length === 0) return null;
  let sumWx = 0;
  let sumC = 0;
  for (const g of grades) {
    const c = Number.isFinite(g.coefficient) && g.coefficient > 0 ? g.coefficient : 1;
    sumWx += g.value * c;
    sumC += c;
  }
  if (sumC <= 0) return null;
  return sumWx / sumC;
}

export async function loadStudentDashboardPayload(
  where: { id: string },
): Promise<DashboardBuildPayload | null> {
  const student = await prisma.user.findUnique({
    where,
    include: {
      class: {
        include: {
          students: {
            include: { grades: true }
          },
          lessons: {
            where: { startTime: { gte: new Date() }, isCancelled: false },
            orderBy: { startTime: 'asc' },
            take: 1,
            include: { subject: true, teacher: true, room: true }
          }
        }
      },
      grades: {
        orderBy: { createdAt: "desc" },
      },
      absences: true,
    },
  });

  if (!student) return null;

  // 1. Attendance
  const totalLessonsCount = await prisma.attendance.count({ where: { studentId: student.id } });
  const presenceCount = await prisma.attendance.count({ 
    where: { studentId: student.id, status: 'PRESENT' } 
  });
  const attendanceRate = totalLessonsCount > 0 ? (presenceCount / totalLessonsCount) * 100 : 100;

  const absenceCount = student.absences.filter(
    (a) => a.status === "ABSENT" || a.status === "EXCUSED",
  ).length;
  const delayCount = student.absences.filter(
    (a) => a.status === "LATE",
  ).length;

  // 2. Average & Rank
  const generalAverage = weightedAverage(student.grades);
  
  let rank: number | null = null;
  let classSize = 0;
  if (student.class) {
    const classAverages = student.class.students.map(s => ({
      id: s.id,
      avg: weightedAverage(s.grades) ?? 0
    })).sort((a, b) => b.avg - a.avg);
    
    classSize = classAverages.length;
    const myIndex = classAverages.findIndex(a => a.id === student.id);
    if (myIndex !== -1) rank = myIndex + 1;
  }

  // 3. Next Lesson
  const nextLesson = student.class?.lessons[0] || null;

  // 4. Upcoming Homework
  const homeworkLessons = student.class ? await prisma.lesson.findMany({
    where: {
      classId: student.class.id,
      homework: { not: "" },
      startTime: { lte: new Date(), gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
    },
    orderBy: { startTime: 'desc' },
    take: 5,
    include: { subject: { select: { name: true } } }
  }) : [];

  const homeworks = homeworkLessons.map(l => ({
    subjectName: l.subject.name,
    content: l.homework!,
    date: l.startTime.toISOString()
  }));

  // 5. Chart Rows (Order by date asc for chart)
  const chartRows: DashboardChartRow[] = [...student.grades].reverse().map((g) => {
    const d = g.createdAt;
    return {
      isoDate: d.toISOString(),
      dateLabel: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      note: g.value,
      coefficient: g.coefficient,
      subjectName: g.subjectName ?? "Inconnue",
    };
  });

  return {
    studentDisplayName: `${student.lastName} ${student.firstName}`,
    studentEmail: student.email ?? "",
    classLabel: student.class?.name ?? "Non assignée",
    generalAverage,
    chartRows,
    absenceCount,
    delayCount,
    attendanceRate,
    rank,
    classSize,
    lastGrade: student.grades[0] ? {
      value: student.grades[0].value,
      subjectName: student.grades[0].subjectName ?? "Matière",
      date: student.grades[0].createdAt.toISOString()
    } : null,
    nextLesson: nextLesson ? {
      subjectName: nextLesson.subject.name,
      startTime: nextLesson.startTime.toISOString(),
      roomName: nextLesson.room?.name ?? "Salle TBD"
    } : null,
    upcomingHomework: homeworks
  };
}
