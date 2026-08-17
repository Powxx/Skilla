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
    const studentProfile = await prisma.user.findUnique({ where: { id: session.user.id }, select: { classId: true } });
    if (studentProfile?.classId !== classId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (role === "TEACHER" && teacherId) {
    if (session.user.id !== teacherId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // For parents and employers, we trust the classId for now as it's resolved server-side 
  // in their respective page components. In a strict production environment, 
  // we would verify the link between session.user.id and the classId requested.

  const date = new Date(dateStr);
  
  let dispensations: string[] = [];
  if (session.user.role === "STUDENT") {
      const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          include: { dispensations: true }
      });
      dispensations = user?.dispensations.map(d => d.subjectId) || [];
  }

  const whereClause: any = {
    startTime: {
      gte: startOfWeek(date, { weekStartsOn: 1 }),
      lte: endOfWeek(date, { weekStartsOn: 1 }),
    },
  };

  if (session.user.role === "TEACHER") {
      whereClause.isFreeLesson = false;
  }

  if (session.user.role === "STUDENT") {
      const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          include: { dispensations: true }
      });
      dispensations = user?.dispensations.map(d => d.subjectId) || [];
      whereClause.OR = [
          { subjectId: { notIn: dispensations } },
          { isFreeLesson: true }
      ];
  }

  if (classId) whereClause.classId = classId;
  if (teacherId) {
      if (whereClause.OR) {
          // If we already have an OR (like for students), we need to be careful.
          // But for teachers, we wouldn't have the student OR.
      } else {
          whereClause.OR = [
            { teacherId: teacherId },
            { substituteId: teacherId }
          ];
      }
  }

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

  const formattedEvents = lessons.map((lesson) => {
    const subjectName = lesson.isFreeLesson ? (lesson.customSubject || "Cours libre") : (lesson.subject?.name || "Sans nom");
    const teacherName = lesson.isFreeLesson ? (lesson.customTeacher || "Intervenant") : (lesson.teacher ? `${lesson.teacher.firstName} ${lesson.teacher.lastName}` : "Sans prof");

    return {
      id: lesson.id,
      title: subjectName,
      start: lesson.startTime.toISOString(),
      end: lesson.endTime.toISOString(),
      backgroundColor: lesson.isFreeLesson ? "#8b5cf6" : (lesson.isCancelled ? "#ef4444" : lesson.substitute ? "#f59e0b" : "#3b82f6"),
      extendedProps: {
        teacher: teacherName,
        teacherId: lesson.teacherId,
        subject: subjectName,
        subjectId: lesson.subjectId,
        class: lesson.class.name,
        classId: lesson.classId,
        room: lesson.room?.name,
        roomId: lesson.roomId,
        isCancelled: lesson.isCancelled,
        isFreeLesson: lesson.isFreeLesson,
        substituteId: lesson.substituteId,
        substitute: lesson.substitute ? `${lesson.substitute.firstName} ${lesson.substitute.lastName}` : null,
        summary: lesson.summary,
        homework: lesson.homework,
        groupId: lesson.groupId,
        recurrenceId: lesson.recurrenceId
      }
    };
  });

  // --- Inject holiday events ---
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
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

  return NextResponse.json([...formattedEvents, ...holidayEvents]);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const data = await request.json();
    const newLesson = await prisma.lesson.create({
      data: {
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        classId: data.classId,
        subjectId: data.isFreeLesson ? null : data.subjectId,
        teacherId: data.isFreeLesson ? null : data.teacherId,
        roomId: data.roomId || null,
        groupId: data.groupId || null,
        recurrenceId: data.recurrenceId || null,
        isFreeLesson: data.isFreeLesson || false,
        customSubject: data.customSubject || null,
        customTeacher: data.customTeacher || null
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
    const { id, updateSeries, updateGroup, ...updateData } = data;
    
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

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (updateData.startTime) updateData.startTime = new Date(updateData.startTime);
    if (updateData.endTime) updateData.endTime = new Date(updateData.endTime);

    // Fetch existing lesson to check for changes
    const oldLesson = await prisma.lesson.findUnique({
      where: { id },
      include: { class: { include: { students: true } }, subject: true }
    });

    if (!oldLesson) {
      return NextResponse.json({ error: "Cours non trouvé" }, { status: 404 });
    }

    // Determine target lessons for update
    let targetLessonIds = [id];
    if (updateSeries && oldLesson.recurrenceId) {
      const lessonsInSeries = await prisma.lesson.findMany({
        where: { recurrenceId: oldLesson.recurrenceId },
        select: { id: true }
      });
      targetLessonIds = lessonsInSeries.map(l => l.id);
    } else if (updateGroup && oldLesson.groupId) {
      const lessonsInGroup = await prisma.lesson.findMany({
        where: { groupId: oldLesson.groupId, startTime: oldLesson.startTime },
        select: { id: true }
      });
      targetLessonIds = lessonsInGroup.map(l => l.id);
    }

    // Update target lessons
    const lessonsToNotify = await prisma.lesson.findMany({
      where: { id: { in: targetLessonIds } },
      include: { class: { include: { students: true } }, subject: true }
    });

    for (const lesson of lessonsToNotify) {
      const isRoomChanged = updateData.roomId !== undefined && updateData.roomId !== lesson.roomId;
      const isCancelledNow = updateData.isCancelled === true && !lesson.isCancelled;

      await prisma.lesson.update({
        where: { id: lesson.id },
        data: updateData
      });

      if (isRoomChanged) {
        const isEnabled = await checkEventEnabled("ROOM_CHANGE");
        if (isEnabled) {
          const room = updateData.roomId ? await prisma.room.findUnique({ where: { id: updateData.roomId } }) : null;
          const subjectName = lesson.isFreeLesson ? (lesson.customSubject || "Cours libre") : (lesson.subject?.name || "Sans matière");
          for (const student of lesson.class.students) {
            createNotification({
              userId: student.id,
              title: "Changement de salle",
              message: `Le cours de ${subjectName} aura lieu en ${room?.name || 'salle non définie'}.`,
              type: "INFO",
              link: "/student/planning"
            }).catch(e => console.error(e));
          }
        }
      }

      if (isCancelledNow) {
        const isEnabled = await checkEventEnabled("LESSON_CANCELLED");
        if (isEnabled) {
          const subjectName = lesson.isFreeLesson ? (lesson.customSubject || "Cours libre") : (lesson.subject?.name || "Sans matière");
          for (const student of lesson.class.students) {
            createNotification({
              userId: student.id,
              title: "Cours annulé",
              message: `Le cours de ${subjectName} du ${lesson.startTime.toLocaleDateString('fr-FR')} a été annulé.`,
              type: "ERROR",
              link: "/student/planning"
            }).catch(e => console.error(e));
          }
        }
      }
    }

    const updatedLesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        class: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
        substitute: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    return NextResponse.json(updatedLesson);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("Missing ID");

    const deleteSeries = searchParams.get("deleteSeries") === "true";
    const deleteGroup = searchParams.get("deleteGroup") === "true";

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      select: { recurrenceId: true, groupId: true, startTime: true }
    });

    if (!lesson) {
      return NextResponse.json({ error: "Cours non trouvé" }, { status: 404 });
    }

    let targetIds = [id];
    if (deleteSeries && lesson.recurrenceId) {
      const series = await prisma.lesson.findMany({
        where: { recurrenceId: lesson.recurrenceId },
        select: { id: true }
      });
      targetIds = series.map(l => l.id);
    } else if (deleteGroup && lesson.groupId) {
      const group = await prisma.lesson.findMany({
        where: { groupId: lesson.groupId, startTime: lesson.startTime },
        select: { id: true }
      });
      targetIds = group.map(l => l.id);
    }

    // Delete related substitution requests first
    await prisma.substitutionRequest.deleteMany({
      where: { lessonId: { in: targetIds } }
    });

    await prisma.lesson.deleteMany({
      where: { id: { in: targetIds } }
    });

    return NextResponse.json({ success: true, deletedIds: targetIds });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}