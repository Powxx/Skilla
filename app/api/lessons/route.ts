import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek } from "date-fns";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { createNotification, checkEventEnabled, sendClassNotification } from "@/app/actions/notifications";

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

  const date = new Date(dateStr);
  const whereClause: any = {
    startTime: {
      gte: startOfWeek(date, { weekStartsOn: 1 }),
      lte: endOfWeek(date, { weekStartsOn: 1 }),
    },
  };

  // Security check and role-based scoping
  const role = session.user.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  let dispensations: string[] = [];

  if (role === "STUDENT") {
    const student = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { classId: true, dispensations: { select: { subjectId: true } } },
    });

    if (!student?.classId) {
      return NextResponse.json([]);
    }

    if (classId && classId !== student.classId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Always enforce the student's own class
    whereClause.classId = student.classId;
    dispensations = student.dispensations.map((d) => d.subjectId);
    whereClause.OR = [
      { subjectId: { notIn: dispensations } },
      { isFreeLesson: true },
    ];
  } else if (role === "TEACHER") {
    if (teacherId && teacherId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    whereClause.isFreeLesson = false;
    if (classId) {
      whereClause.classId = classId;
    } else {
      whereClause.OR = [
        { teacherId: session.user.id },
        { substituteId: session.user.id },
      ];
    }
  } else if (role === "RESPONSIBLE") {
    const parent = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { students: { select: { classId: true } } },
    });
    const allowedClassIds = (parent?.students || []).map((s) => s.classId).filter(Boolean) as string[];
    if (classId) {
      if (!allowedClassIds.includes(classId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      whereClause.classId = classId;
    } else if (allowedClassIds.length > 0) {
      whereClause.classId = { in: allowedClassIds };
    } else {
      return NextResponse.json([]);
    }
  } else if (role === "COMPANY_TUTOR") {
    const tutorContracts = await prisma.companyContract.findMany({
      where: { tutorId: session.user.id },
      select: { student: { select: { classId: true } } },
    });
    const allowedClassIds = tutorContracts.map((c) => c.student?.classId).filter(Boolean) as string[];
    if (classId) {
      if (!allowedClassIds.includes(classId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      whereClause.classId = classId;
    } else if (allowedClassIds.length > 0) {
      whereClause.classId = { in: allowedClassIds };
    } else {
      return NextResponse.json([]);
    }
  } else if (isAdmin) {
    if (classId) whereClause.classId = classId;
    if (teacherId) {
      whereClause.OR = [
        { teacherId: teacherId },
        { substituteId: teacherId },
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
    const teacherName = lesson.isFreeLesson ? (lesson.customTeacher || "Intervenant") : (lesson.teacher ? `${(lesson.teacher.lastName || "").toUpperCase()} ${lesson.teacher.firstName || ""}` : "Sans prof");

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
        substitute: lesson.substitute ? `${(lesson.substitute.lastName || "").toUpperCase()} ${lesson.substitute.firstName || ""}` : null,
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
    const { id, updateSeries, updateGroup, notifyStudents, ...updateData } = data;
    
    // Check ownership if teacher
    if (session.user.role === "TEACHER") {
      const lesson = await prisma.lesson.findUnique({
        where: { id },
        select: { teacherId: true, substituteId: true }
      });
      if (lesson?.teacherId !== session.user.id && lesson?.substituteId !== session.user.id) {
        return NextResponse.json({ error: "Vous ne pouvez modifier que vos propres cours" }, { status: 403 });
      }
      
      // Teachers can only update summary and homework
      const allowedKeys = ["summary", "homework"];
      const filteredData: any = {};
      allowedKeys.forEach(k => { if (k in updateData) filteredData[k] = updateData[k]; });
      
      const updatedLesson = await prisma.lesson.update({
        where: { id },
        data: filteredData,
        include: {
          class: { select: { id: true, name: true } },
          subject: { select: { name: true } }
        }
      });

      // Si le professeur a renseigné un devoir et souhaite notifier la classe
      if (notifyStudents && filteredData.homework?.trim()) {
        const subjectName = updatedLesson.isFreeLesson 
          ? (updatedLesson.customSubject || "Cours") 
          : (updatedLesson.subject?.name || "Cours");

        await sendClassNotification({
          classId: updatedLesson.classId,
          title: `Nouveau devoir : ${subjectName}`,
          message: `Travail à faire : ${filteredData.homework.trim().length > 120 ? filteredData.homework.trim().substring(0, 120) + "..." : filteredData.homework.trim()}`,
          type: "INFO"
        }).catch(err => console.error("[PUT /api/lessons] Devoir notification error:", err));
      }

      revalidatePath("/student/devoirs");
      revalidatePath("/student/dashboard");
      revalidatePath("/prof/devoirs");
      revalidatePath("/admin/devoirs");
      revalidatePath("/prof/planning");

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

    if (notifyStudents && updateData.homework?.trim() && updatedLesson) {
      const subjectName = updatedLesson.isFreeLesson 
        ? (updatedLesson.customSubject || "Cours") 
        : (updatedLesson.subject?.name || "Cours");

      await sendClassNotification({
        classId: updatedLesson.classId,
        title: `Nouveau devoir : ${subjectName}`,
        message: `Travail à faire : ${updateData.homework.trim().length > 120 ? updateData.homework.trim().substring(0, 120) + "..." : updateData.homework.trim()}`,
        type: "INFO"
      }).catch(err => console.error("[PUT /api/lessons] Admin devoir notification error:", err));
    }

    revalidatePath("/student/devoirs");
    revalidatePath("/student/dashboard");
    revalidatePath("/prof/devoirs");
    revalidatePath("/admin/devoirs");
    revalidatePath("/prof/planning");
    revalidatePath("/admin/planning");

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