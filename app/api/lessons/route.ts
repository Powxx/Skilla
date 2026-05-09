import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek } from "date-fns";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import type { Role } from "@prisma/client";
import { createNotification, checkEventEnabled } from "@/app/actions/notifications";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");
  const teacherId = searchParams.get("teacherId");
  const dateStr = searchParams.get("date"); // The monday of the requested week

  if (!dateStr) {
    return NextResponse.json({ error: "Date manquante" }, { status: 400 });
  }

  // Security check
  const role = session.user.role as Role;
  if (role === "STUDENT" && classId) {
    // Ideally verify if student belongs to classId, here we trust the request mostly
    // or just fetch by student's classId directly instead of relying on param
    const studentProfile = await prisma.user.findUnique({ where: { id: session.user.id }, select: { classId: true } });
    if (studentProfile?.classId !== classId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (role === "TEACHER" && teacherId) {
    if (session.user.id !== teacherId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // For parents/employers, we assume the frontend sends the valid classId of the child they verified. 
  // In a real app we would strictly verify `parentOwnsStudent` for that classId.

  const date = new Date(dateStr);
  const whereClause: any = {
    startTime: {
      gte: startOfWeek(date, { weekStartsOn: 1 }),
      lte: endOfWeek(date, { weekStartsOn: 1 }),
    },
  };

  if (classId) whereClause.classId = classId;
  if (teacherId) whereClause.teacherId = teacherId;

  const lessons = await prisma.lesson.findMany({
    where: whereClause,
    include: {
      subject: { select: { id: true, name: true } },
      teacher: { select: { id: true, firstName: true, lastName: true } },
      class: { select: { id: true, name: true } },
      room: { select: { id: true, name: true } },
      substitute: { select: { id: true, firstName: true, lastName: true } }
    },
  });

  const formattedEvents = lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.subject.name,
    start: lesson.startTime.toISOString(),
    end: lesson.endTime.toISOString(),
    backgroundColor: lesson.isCancelled ? "#ef4444" : lesson.substitute ? "#f59e0b" : "#3b82f6",
    extendedProps: {
      teacher: `${lesson.teacher.firstName} ${lesson.teacher.lastName}`,
      teacherId: lesson.teacherId,
      subject: lesson.subject.name,
      subjectId: lesson.subjectId,
      class: lesson.class.name,
      classId: lesson.classId,
      room: lesson.room?.name,
      roomId: lesson.roomId,
      isCancelled: lesson.isCancelled,
      substituteId: lesson.substituteId,
      substitute: lesson.substitute ? `${lesson.substitute.firstName} ${lesson.substitute.lastName}` : null,
      summary: lesson.summary,
      homework: lesson.homework
    }
  }));

  // --- Inject lunch break events ---
  const lunchSettings = await prisma.globalSetting.findMany({
    where: { key: { in: ['LUNCH_START', 'LUNCH_END'] } }
  });
  const lunchMap: Record<string, string> = {};
  lunchSettings.forEach(s => { lunchMap[s.key] = s.value; });

  const lunchStart = lunchMap['LUNCH_START'] || '12:00';
  const lunchEnd   = lunchMap['LUNCH_END']   || '13:30';

  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

  const lunchEvents: any[] = [];
  for (let i = 0; i < 5; i++) { // Mon → Fri
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    const [sh, sm] = lunchStart.split(':').map(Number);
    const [eh, em] = lunchEnd.split(':').map(Number);
    const start = new Date(day); start.setHours(sh, sm, 0, 0);
    const end   = new Date(day); end.setHours(eh, em, 0, 0);
    lunchEvents.push({
      id: `lunch-${i}`,
      title: 'Pause repas',
      start: start.toISOString(),
      end:   end.toISOString(),
      display: 'background',
      backgroundColor: '#fef9c3',
      borderColor: '#fde68a',
      extendedProps: { type: 'break' }
    });
  }

  // --- Inject holiday events ---
  const holidays = await prisma.holiday.findMany({
    where: {
      date: {
        gte: weekStart,
        lte: weekEnd,
      }
    }
  });

  const holidayEvents: any[] = [];
  holidays.forEach(h => {
    // Shading
    holidayEvents.push({
      id: `holiday-bg-${h.id}`,
      start: new Date(new Date(h.date).setHours(8, 0, 0, 0)).toISOString(),
      end: new Date(new Date(h.date).setHours(20, 0, 0, 0)).toISOString(),
      display: 'background',
      backgroundColor: '#fee2e2',
      extendedProps: { type: 'holiday' }
    });
    // Label
    holidayEvents.push({
      id: `holiday-label-${h.id}`,
      title: h.name,
      start: new Date(new Date(h.date).setHours(8, 0, 0, 0)).toISOString(),
      end: new Date(new Date(h.date).setHours(20, 0, 0, 0)).toISOString(),
      editable: false,
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: '#ef4444',
      extendedProps: { type: 'holiday-label' }
    });
  });

  return NextResponse.json([...formattedEvents, ...lunchEvents, ...holidayEvents]);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const data = await request.json();
    const newLesson = await prisma.lesson.create({
      data: {
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        classId: data.classId,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        roomId: data.roomId || null,
      }
    });
    return NextResponse.json(newLesson);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { id, ...updateData } = data;
    
    // Check ownership if teacher
    if (session.user.role === "TEACHER") {
      const lesson = await prisma.lesson.findUnique({ where: { id }, select: { teacherId: true } });
      if (lesson?.teacherId !== session.user.id) {
        return NextResponse.json({ error: "Vous ne pouvez modifier que vos propres cours" }, { status: 403 });
      }
      
      // Teachers can only update summary and homework
      const allowedKeys = ["summary", "homework"];
      const filteredData: any = {};
      allowedKeys.forEach(k => { if (k in updateData) filteredData[k] = updateData[k]; });
      
      const updatedLesson = await prisma.lesson.update({
        where: { id },
        data: filteredData,
      });
      return NextResponse.json(updatedLesson);
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (updateData.startTime) updateData.startTime = new Date(updateData.startTime);
    if (updateData.endTime) updateData.endTime = new Date(updateData.endTime);

    // Fetch existing lesson to check for changes
    const oldLesson = await prisma.lesson.findUnique({
      where: { id },
      include: { class: { include: { students: true } }, subject: true }
    });

    const updatedLesson = await prisma.lesson.update({
      where: { id },
      data: updateData,
    });

    // Handle Notifications
    if (oldLesson) {
      // 1. Room Change
      if (updateData.roomId !== undefined && updateData.roomId !== oldLesson.roomId) {
        const isEnabled = await checkEventEnabled("ROOM_CHANGE");
        if (isEnabled) {
          const room = updateData.roomId ? await prisma.room.findUnique({ where: { id: updateData.roomId } }) : null;
          for (const student of oldLesson.class.students) {
            createNotification({
              userId: student.id,
              title: "Changement de salle",
              message: `Le cours de ${oldLesson.subject.name} aura lieu en ${room?.name || 'salle non définie'}.`,
              type: "INFO",
              link: "/student/planning"
            }).catch(e => console.error(e));
          }
        }
      }

      // 2. Cancellation
      if (updateData.isCancelled === true && !oldLesson.isCancelled) {
        const isEnabled = await checkEventEnabled("LESSON_CANCELLED");
        if (isEnabled) {
          for (const student of oldLesson.class.students) {
            createNotification({
              userId: student.id,
              title: "Cours annulé",
              message: `Le cours de ${oldLesson.subject.name} du ${oldLesson.startTime.toLocaleDateString('fr-FR')} a été annulé.`,
              type: "ERROR",
              link: "/student/planning"
            }).catch(e => console.error(e));
          }
        }
      }
    }

    return NextResponse.json(updatedLesson);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("Missing ID");

    await prisma.lesson.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}