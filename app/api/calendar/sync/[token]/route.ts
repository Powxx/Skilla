import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import * as ics from "ics";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Token manquant" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { calendarToken: token },
    select: { id: true, role: true, classId: true }
  });

  if (!user) {
    return NextResponse.json({ error: "Token invalide" }, { status: 404 });
  }

  const whereClause: any = {};
  if (user.role === "TEACHER") {
    whereClause.teacherId = user.id;
    whereClause.isFreeLesson = false;
  } else if (user.role === "STUDENT" && user.classId) {
    whereClause.classId = user.classId;
  } else {
    // If admin or other, maybe they want their own lessons if any, 
    // but usually admins want to see everything. For sync, we restrict to their own context.
    whereClause.OR = [
        { teacherId: user.id },
        { classId: user.classId || 'none' }
    ];
  }

  // We export from 1 month ago to 1 year in the future for sync
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 12, 1);

  whereClause.startTime = {
    gte: startDate,
    lte: endDate,
  };
  whereClause.isCancelled = false;

  const lessons = await prisma.lesson.findMany({
    where: whereClause,
    include: {
      subject: true,
      teacher: true,
      class: true,
      room: true,
    },
    orderBy: { startTime: 'asc' }
  });

  const events: ics.EventAttributes[] = lessons.map((lesson) => {
    const start = new Date(lesson.startTime);
    const end = new Date(lesson.endTime);
    const subjectName = lesson.isFreeLesson ? (lesson.customSubject || "Cours libre") : (lesson.subject?.name || "Sans nom");
    const teacherName = lesson.isFreeLesson ? (lesson.customTeacher || "Intervenant") : (lesson.teacher ? `${lesson.teacher.firstName} ${lesson.teacher.lastName}` : "Sans prof");

    return {
      start: [
        start.getFullYear(),
        start.getMonth() + 1,
        start.getDate(),
        start.getHours(),
        start.getMinutes(),
      ],
      end: [
        end.getFullYear(),
        end.getMonth() + 1,
        end.getDate(),
        end.getHours(),
        end.getMinutes(),
      ],
      title: subjectName,
      description: `Professeur: ${teacherName}\nClasse: ${lesson.class.name}${lesson.summary ? `\n\nRésumé: ${lesson.summary}` : ''}`,
      location: lesson.room?.name || "Salle non définie",
      categories: ['Cours', subjectName],
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      productId: 'Skilla//Calendar//FR',
    };
  });

  const { error, value } = ics.createEvents(events);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la génération" }, { status: 500 });
  }

  return new Response(value, {
    headers: {
      "Content-Type": "text/calendar",
      "Content-Disposition": `inline; filename="calendar.ics"`,
      "Cache-Control": "public, s-maxage=3600", // Cache for 1 hour
    },
  });
}
