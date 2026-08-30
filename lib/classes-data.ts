import prisma from "@/lib/prisma";
import { isWithinInterval } from "date-fns";

export async function getClassStudentsData(classId: string, semesterId?: string) {
  // 1. Find the semester
  let activeSemesterId = semesterId;
  if (!activeSemesterId) {
    const now = new Date();
    const semesters = await prisma.semester.findMany({
      orderBy: { startDate: "desc" },
    });
    const currentSemester = semesters.find((s) =>
      isWithinInterval(now, { start: s.startDate, end: s.endDate })
    ) ?? semesters[0] ?? null;
    activeSemesterId = currentSemester?.id;
  }

  // 2. Fetch the class and its students
  const classData = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      students: {
        where: { isActive: true },
        orderBy: [
          { lastName: "asc" },
          { firstName: "asc" }
        ],
        include: {
          grades: {
            where: activeSemesterId ? { semesterId: activeSemesterId } : undefined,
            select: { value: true, coefficient: true }
          },
          absences: {
            select: { status: true }
          }
        }
      }
    }
  });

  if (!classData) return null;

  // 3. Compute student and class level stats
  const students = classData.students.map((student) => {
    // Weighted average
    let sumWx = 0;
    let sumC = 0;
    for (const g of student.grades) {
      const c = Number.isFinite(g.coefficient) && g.coefficient > 0 ? g.coefficient : 1;
      sumWx += g.value * c;
      sumC += c;
    }
    const average = sumC > 0 ? sumWx / sumC : null;

    // Absences and lates
    const totalAbsences = student.absences.filter(a => a.status === "ABSENT").length;
    const excusedAbsences = student.absences.filter(a => a.status === "EXCUSED").length;
    const totalLates = student.absences.filter(a => a.status === "LATE").length;

    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone,
      conductPoints: student.conductPoints,
      average: average !== null ? Math.round(average * 100) / 100 : null,
      absencesCount: totalAbsences,
      excusedCount: excusedAbsences,
      latesCount: totalLates,
    };
  });

  // Class stats
  const studentsWithAverages = students.filter(s => s.average !== null);
  const classAverage = studentsWithAverages.length > 0
    ? studentsWithAverages.reduce((acc, s) => acc + (s.average as number), 0) / studentsWithAverages.length
    : null;

  // Class attendance rate
  // Let's compute attendance rate as: present lessons / total lessons for all students
  const classLessons = await prisma.lesson.findMany({
    where: {
      classId,
      isCancelled: false,
      isFreeLesson: false,
      startTime: activeSemesterId ? {
        gte: (await prisma.semester.findUnique({ where: { id: activeSemesterId } }))?.startDate
      } : undefined
    },
    select: { id: true }
  });
  const lessonIds = classLessons.map(l => l.id);

  const attendances = await prisma.attendance.findMany({
    where: {
      lessonId: { in: lessonIds },
    },
    select: { status: true }
  });

  const totalAttendances = attendances.length;
  const presentCount = attendances.filter(a => a.status === "PRESENT").length;
  const classAttendanceRate = totalAttendances > 0
    ? (presentCount / totalAttendances) * 100
    : 100;

  const atRiskCount = students.filter(s => 
    (s.average !== null && s.average < 10) || s.conductPoints <= 50 || s.absencesCount > 5
  ).length;

  return {
    classId: classData.id,
    className: classData.name,
    students,
    stats: {
      totalStudents: students.length,
      classAverage: classAverage !== null ? Math.round(classAverage * 100) / 100 : null,
      attendanceRate: Math.round(classAttendanceRate),
      atRiskCount,
    }
  };
}

export async function getTeacherClasses(teacherId: string) {
  const teacherLessons = await prisma.lesson.findMany({
    where: { teacherId },
    select: { 
      class: {
        select: { id: true, name: true }
      }
    }
  });
  // Deduplicate classes
  const classesMap = new Map<string, string>();
  for (const l of teacherLessons) {
    if (l.class) {
      classesMap.set(l.class.id, l.class.name);
    }
  }
  return Array.from(classesMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}
