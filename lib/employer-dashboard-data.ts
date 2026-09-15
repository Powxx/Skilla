import prisma from "@/lib/prisma";

export function formatStudentName(firstName?: string | null, lastName?: string | null): string {
  const cleanLast = (lastName || "").trim();
  const firstInitial = (firstName || "").trim().charAt(0);
  if (!cleanLast) return firstName || "Élève";
  if (!firstInitial) return cleanLast;
  return `${cleanLast} ${firstInitial.toUpperCase()}.`;
}

export async function loadEmployerDashboardPayload(tutorId: string) {
  const now = new Date();

  // Find students monitored by this tutor
  const contracts = await prisma.companyContract.findMany({
    where: { tutorId },
    include: {
      student: {
        include: {
          class: true,
          absences: {
            take: 10,
            orderBy: { lesson: { startTime: 'desc' } },
            include: { lesson: { include: { subject: true, room: true } } }
          },
          evaluations: {
            orderBy: { level: 'desc' },
            take: 5
          }
        }
      }
    }
  });

  if (contracts.length === 0) return null;

  const result = await Promise.all(
    contracts.map(async (c) => {
      const student = c.student;
      const classId = student.classId;

      // Fetch upcoming lessons for this student's class
      const upcomingLessons = classId
        ? await prisma.lesson.findMany({
            where: {
              classId,
              startTime: { gte: now },
              isCancelled: false
            },
            orderBy: { startTime: 'asc' },
            take: 6,
            include: {
              subject: { select: { name: true } },
              teacher: { select: { firstName: true, lastName: true } },
              substitute: { select: { firstName: true, lastName: true } },
              room: { select: { name: true } }
            }
          })
        : [];

      const formattedName = formatStudentName(student.firstName, student.lastName);

      return {
        studentId: student.id,
        name: formattedName,
        fullName: `${student.firstName} ${student.lastName}`.trim(),
        class: student.class?.name || "N/A",
        contractType: c.type,
        endDate: c.endDate.toISOString(),
        absences: student.absences.map(a => ({
          date: a.lesson.startTime.toISOString(),
          subject: a.lesson.isFreeLesson ? (a.lesson.customSubject || "Cours libre") : (a.lesson.subject?.name || "Sans matière"),
          status: a.status
        })),
        upcomingLessons: upcomingLessons.map(l => {
          const teacherUser = l.substitute || l.teacher;
          return {
            id: l.id,
            subject: l.isFreeLesson ? (l.customSubject || "Cours libre") : (l.subject?.name || "Sans matière"),
            startTime: l.startTime.toISOString(),
            endTime: l.endTime.toISOString(),
            room: l.room?.name || "N/A",
            teacher: teacherUser ? `${teacherUser.lastName} ${teacherUser.firstName?.charAt(0)}.` : "Sans prof"
          };
        }),
        skills: student.evaluations.map(e => ({
          name: e.competency,
          level: e.level
        }))
      };
    })
  );

  return result;
}
