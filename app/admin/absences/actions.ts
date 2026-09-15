"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";
import { AttendanceStatus } from "@prisma/client";
import { createNotification, checkEventEnabled } from "@/app/actions/notifications";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    throw new Error("Accès réservé aux administrateurs.");
  }
  return session;
}

export type LessonWithAttendancePayload = {
  id: string;
  subjectName: string;
  className: string;
  classId: string;
  teacherName: string;
  roomName: string;
  startTime: string;
  endTime: string;
  isAttendanceValidated: boolean;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  totalClassStudents: number;
  students: Array<{
    studentId: string;
    firstName: string;
    lastName: string;
    formattedName?: string;
    attendanceId: string | null;
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "UNSET";
    lateDuration?: number | null;
  }>;
};

function formatStudentName(firstName?: string | null, lastName?: string | null): string {
  const cleanLast = (lastName || "").trim();
  const cleanFirst = (firstName || "").trim();
  
  if (cleanLast && cleanFirst) {
    return `${cleanLast.toUpperCase()} ${cleanFirst.charAt(0).toUpperCase()}.`;
  }
  if (cleanLast) {
    return cleanLast.toUpperCase();
  }
  if (cleanFirst) {
    const parts = cleanFirst.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const last = parts[parts.length - 1];
      const first = parts[0];
      return `${last.toUpperCase()} ${first.charAt(0).toUpperCase()}.`;
    }
    return cleanFirst.toUpperCase();
  }
  return "ÉLÈVE";
}

/**
 * Récupère les cours sous forme de cartes d'appels avec les indicateurs et les élèves.
 */
export async function getAdminLessonsWithAttendance(filters?: {
  classId?: string;
  search?: string;
  date?: string;
}): Promise<LessonWithAttendancePayload[]> {
  await requireAdmin();

  let whereClause: any = {
    isCancelled: false
  };

  if (filters?.classId) {
    whereClause.classId = filters.classId;
  }

  if (filters?.date) {
    const targetDate = new Date(filters.date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    whereClause.startTime = { gte: startOfDay, lte: endOfDay };
  } else {
    // Par défaut, afficher les cours passés et récents (jusqu'à demain fin de journée) pour faire remonter les cours du jour et récents
    const endOfTomorrow = new Date();
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
    endOfTomorrow.setHours(23, 59, 59, 999);
    whereClause.startTime = { lte: endOfTomorrow };
  }

  const lessons = await prisma.lesson.findMany({
    where: whereClause,
    include: {
      subject: { select: { name: true } },
      class: {
        include: {
          students: {
            where: { isActive: true },
            select: { id: true, firstName: true, lastName: true },
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
          }
        }
      },
      teacher: { select: { firstName: true, lastName: true } },
      substitute: { select: { firstName: true, lastName: true } },
      room: { select: { name: true } },
      attendances: {
        include: {
          student: { select: { id: true, firstName: true, lastName: true } }
        }
      }
    },
    orderBy: { startTime: 'desc' },
    take: 120
  });

  return lessons.map((lesson) => {
    const teacherUser = lesson.substitute || lesson.teacher;
    const teacherName = teacherUser ? `${teacherUser.firstName} ${teacherUser.lastName}` : "Sans prof";
    const subjectName = lesson.isFreeLesson ? (lesson.customSubject || "Cours libre") : (lesson.subject?.name || "Sans matière");
    const className = lesson.class?.name || "Sans classe";
    const roomName = lesson.room?.name || "Non assignée";
    const isAttendanceValidated = lesson.isAttendanceValidated || lesson.attendances.length > 0;

    // Map d'émargement existant
    const attendanceMap = new Map<string, { id: string; status: AttendanceStatus; lateDuration?: number | null }>();
    lesson.attendances.forEach((att) => {
      attendanceMap.set(att.studentId, { id: att.id, status: att.status, lateDuration: att.lateDuration });
    });

    // Combiner les élèves de la classe + tout élève supplémentaire qui aurait une présence enregistrée sur cette leçon
    const allStudentsMap = new Map<string, { firstName: string; lastName: string }>();
    lesson.class?.students.forEach((s) => allStudentsMap.set(s.id, { firstName: s.firstName || "", lastName: s.lastName || "" }));
    lesson.attendances.forEach((att) => {
      if (att.student && !allStudentsMap.has(att.student.id)) {
        allStudentsMap.set(att.student.id, { firstName: att.student.firstName || "", lastName: att.student.lastName || "" });
      }
    });

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    const studentList: Array<{
      studentId: string;
      firstName: string;
      lastName: string;
      formattedName: string;
      attendanceId: string | null;
      status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "UNSET";
      lateDuration?: number | null;
    }> = [];

    allStudentsMap.forEach((info, studentId) => {
      const existing = attendanceMap.get(studentId);
      const formattedName = formatStudentName(info.firstName, info.lastName);

      let status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "UNSET" = "UNSET";
      if (existing) {
        status = existing.status;
      } else if (isAttendanceValidated) {
        status = "PRESENT";
      } else {
        status = "UNSET";
      }
      
      if (status === "PRESENT") presentCount++;
      else if (status === "ABSENT") absentCount++;
      else if (status === "LATE") lateCount++;
      else if (status === "EXCUSED") excusedCount++;

      studentList.push({
        studentId,
        firstName: info.firstName,
        lastName: info.lastName,
        formattedName,
        attendanceId: existing?.id || null,
        status: status as any,
        lateDuration: existing?.lateDuration
      });
    });

    // Filtre de recherche par texte si fourni
    let filteredStudents = studentList;
    if (filters?.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      filteredStudents = studentList.filter(s => 
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.formattedName.toLowerCase().includes(q) ||
        subjectName.toLowerCase().includes(q) ||
        className.toLowerCase().includes(q)
      );
    }

    return {
      id: lesson.id,
      subjectName,
      className,
      classId: lesson.classId,
      teacherName,
      roomName,
      startTime: lesson.startTime.toISOString(),
      endTime: lesson.endTime.toISOString(),
      isAttendanceValidated,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      totalClassStudents: allStudentsMap.size,
      students: filteredStudents
    };
  });
}

/**
 * Met à jour ou crée le statut d'émargement d'un élève pour un cours.
 */
export async function updateStudentAttendance(
  lessonId: string,
  studentId: string,
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
  lateDuration?: number
) {
  await requireAdmin();

  const existing = await prisma.attendance.findFirst({
    where: { lessonId, studentId }
  });

  if (existing) {
    await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        status: status as AttendanceStatus,
        lateDuration: status === "LATE" ? (lateDuration || 15) : null
      }
    });
  } else {
    await prisma.attendance.create({
      data: {
        lessonId,
        studentId,
        status: status as AttendanceStatus,
        lateDuration: status === "LATE" ? (lateDuration || 15) : null
      }
    });
  }

  // Marque la leçon comme validée
  await prisma.lesson.update({
    where: { id: lessonId },
    data: { isAttendanceValidated: true }
  });

  // Déclencher alerte si absence
  if (status === "ABSENT") {
    const isAbsenceEnabled = await checkEventEnabled("ABSENCE_ALERT");
    if (isAbsenceEnabled) {
      const student = await prisma.user.findUnique({
        where: { id: studentId },
        include: { responsibles: true, studentContracts: { include: { tutor: true } } }
      });
      if (student) {
        const targets = [student.id, ...student.responsibles.map(r => r.id), ...student.studentContracts.map(c => c.tutorId)];
        for (const targetId of targets) {
          createNotification({
            userId: targetId,
            title: "Alerte Absence (Admin)",
            message: `Une absence a été enregistrée pour ${student.firstName} ${student.lastName}.`,
            type: "WARNING",
            link: student.role === "STUDENT" ? "/student/absences" : undefined
          }).catch(e => console.error(e));
        }
      }
    }
  }

  revalidatePath("/admin/absences");
  revalidatePath("/prof/appel");
  return { ok: true };
}

export async function markAllStudentsPresent(lessonId: string) {
  await requireAdmin();

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { class: { include: { students: { where: { isActive: true } } } } }
  });

  if (!lesson || !lesson.class) {
    return { ok: false, error: "Cours introuvable" };
  }

  const students = lesson.class.students;

  for (const s of students) {
    const existing = await prisma.attendance.findFirst({
      where: { studentId: s.id, lessonId }
    });
    if (existing) {
      await prisma.attendance.update({
        where: { id: existing.id },
        data: { status: "PRESENT" }
      });
    } else {
      await prisma.attendance.create({
        data: { studentId: s.id, lessonId, status: "PRESENT" }
      });
    }
  }

  await prisma.lesson.update({
    where: { id: lessonId },
    data: { isAttendanceValidated: true }
  });

  revalidatePath("/admin/absences");
  return { ok: true };
}

/**
 * Permet à un administrateur de rajouter un élève spécifique à une carte de cours.
 */
export async function addStudentToCourseCard(lessonId: string, studentId: string, status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" = "PRESENT") {
  await requireAdmin();

  const existing = await prisma.attendance.findFirst({
    where: { studentId, lessonId }
  });

  if (existing) {
    await prisma.attendance.update({
      where: { id: existing.id },
      data: { status: status as AttendanceStatus }
    });
  } else {
    await prisma.attendance.create({
      data: { studentId, lessonId, status: status as AttendanceStatus }
    });
  }

  await prisma.lesson.update({
    where: { id: lessonId },
    data: { isAttendanceValidated: true }
  });

  revalidatePath("/admin/absences");
  return { ok: true };
}

/**
 * Crée un nouveau cours / séance d'appel manuellement par l'administrateur.
 */
export async function createAdminLessonRollCall(data: {
  classId: string;
  subjectId: string;
  teacherId: string;
  roomId?: string;
  startTime: string;
  endTime: string;
}) {
  await requireAdmin();

  const lesson = await prisma.lesson.create({
    data: {
      classId: data.classId,
      subjectId: data.subjectId,
      teacherId: data.teacherId,
      roomId: data.roomId || null,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      isAttendanceValidated: false
    }
  });

  revalidatePath("/admin/absences");
  return { ok: true, lessonId: lesson.id };
}

/**
 * Recherche des élèves éligibles pour les ajouter à une carte de cours.
 */
export async function searchStudentsForCourseCard(query: string = "") {
  await requireAdmin();

  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      isActive: true,
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } }
      ]
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      class: { select: { name: true } }
    },
    take: 20
  });

  return students.map(s => ({
    id: s.id,
    firstName: s.firstName || "",
    lastName: s.lastName || "",
    formattedName: formatStudentName(s.firstName, s.lastName),
    class: s.class
  }));
}
