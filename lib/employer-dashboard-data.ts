import prisma from "@/lib/prisma";

export async function loadEmployerDashboardPayload(tutorId: string) {
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
            include: { lesson: { include: { subject: true } } }
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

  return contracts.map(c => ({
    studentId: c.student.id,
    name: `${c.student.lastName} ${c.student.firstName}`,
    class: c.student.class?.name || "N/A",
    contractType: c.type,
    endDate: c.endDate.toISOString(),
    absences: c.student.absences.map(a => ({
      date: a.lesson.startTime.toISOString(),
      subject: a.lesson.isFreeLesson ? (a.lesson.customSubject || "Cours libre") : (a.lesson.subject?.name || "Sans matière"),
      status: a.status
    })),
    skills: c.student.evaluations.map(e => ({
      name: e.competency,
      level: e.level
    }))
  }));
}
