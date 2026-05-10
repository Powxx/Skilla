import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import * as ics from "ics";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");
  const teacherId = searchParams.get("teacherId");

  // Security checks similar to lessons route
  const role = session.user.role;
  if (role === "STUDENT") {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { classId: true } });
    if (classId && user?.classId !== classId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // If no classId provided, use student's class
    if (!classId && !teacherId) {
      if (!user?.classId) return NextResponse.json({ error: "No class assigned" }, { status: 400 });
      return exportCalendar({ classId: user.classId });
    }
  }

  if (role === "TEACHER") {
    if (teacherId && session.user.id !== teacherId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!teacherId && !classId) {
      return exportCalendar({ teacherId: session.user.id });
    }
  }

  if (role === "ADMIN") {
     if (classId) return exportCalendar({ classId });
     if (teacherId) return exportCalendar({ teacherId });
  }

  // Default export for the requester if no params
  if (role === "STUDENT") {
      const user = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (user?.classId) return exportCalendar({ classId: user.classId });
  } else if (role === "TEACHER") {
      return exportCalendar({ teacherId: session.user.id });
  }

  return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
}

async function exportCalendar({ classId, teacherId }: { classId?: string, teacherId?: string }) {
  const whereClause: any = {};
  if (classId) whereClause.classId = classId;
  if (teacherId) whereClause.teacherId = teacherId;

  // We export from 1 month ago to 6 months in the future
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 6, 1);

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
      title: lesson.subject.name,
      description: `Professeur: ${lesson.teacher.firstName} ${lesson.teacher.lastName}\nClasse: ${lesson.class.name}${lesson.summary ? `\n\nRésumé: ${lesson.summary}` : ''}`,
      location: lesson.room?.name || "Salle non définie",
      categories: ['Cours', lesson.subject.name],
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
    };
  });

  if (events.length === 0) {
      // Create a dummy event if no lessons to avoid ics error or empty file
      // Actually ics handles empty list but let's be safe.
  }

  const { error, value } = ics.createEvents(events);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la génération du calendrier" }, { status: 500 });
  }

  return new Response(value, {
    headers: {
      "Content-Type": "text/calendar",
      "Content-Disposition": `attachment; filename="emploi-du-temps.ics"`,
    },
  });
}
