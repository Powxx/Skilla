import prisma from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export type TeacherDashboardPayload = {
  teacherName: string;
  lessonsTodayCount: number;
  pendingRollCallsCount: number;
  classesCount: number;
  studentsCount: number;
  nextLesson: {
    subject: string;
    class: string;
    start: string;
    room: string;
  } | null;
  recentLessons: {
    id: string;
    subject: string;
    class: string;
    start: string;
    isValidated: boolean;
  }[];
};

export async function loadTeacherDashboardPayload(teacherId: string): Promise<TeacherDashboardPayload> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [teacher, lessonsToday, pendingRollCalls, nextLesson, teacherLessons, recentLessons] = await Promise.all([
    prisma.user.findUnique({
      where: { id: teacherId },
      select: { firstName: true, lastName: true }
    }),
    prisma.lesson.count({
      where: {
        teacherId,
        startTime: { gte: todayStart, lte: todayEnd },
        isCancelled: false
      }
    }),
    prisma.lesson.count({
      where: {
        teacherId,
        startTime: { lte: now },
        isAttendanceValidated: false,
        isCancelled: false
      }
    }),
    prisma.lesson.findFirst({
      where: {
        teacherId,
        startTime: { gte: now },
        isCancelled: false
      },
      orderBy: { startTime: 'asc' },
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        room: { select: { name: true } }
      }
    }),
    prisma.lesson.findMany({
      where: { teacherId },
      select: { classId: true }
    }),
    prisma.lesson.findMany({
      where: {
        teacherId,
        startTime: { lte: now },
        isAttendanceValidated: false,
        isCancelled: false
      },
      orderBy: { startTime: 'desc' },
      take: 5,
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } }
      }
    })
  ]);

  const classIds = [...new Set(teacherLessons.map(l => l.classId))];
  const classesCount = classIds.length;
  
  const studentsCount = await prisma.user.count({
    where: {
      role: "STUDENT",
      classId: { in: classIds }
    }
  });

  return {
    teacherName: `${teacher?.firstName} ${teacher?.lastName}`,
    lessonsTodayCount: lessonsToday,
    pendingRollCallsCount: pendingRollCalls,
    classesCount,
    studentsCount,
    nextLesson: nextLesson ? {
      subject: nextLesson.subject.name,
      class: nextLesson.class.name,
      start: nextLesson.startTime.toISOString(),
      room: nextLesson.room?.name || "N/A"
    } : null,
    recentLessons: recentLessons.map(l => ({
      id: l.id,
      subject: l.subject.name,
      class: l.class.name,
      start: l.startTime.toISOString(),
      isValidated: l.isAttendanceValidated
    }))
  };
}
