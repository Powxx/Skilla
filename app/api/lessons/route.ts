import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek } from "date-fns";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");
  const dateStr = searchParams.get("date"); // Le lundi de la semaine demandée

  if (!classId || !dateStr) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const date = new Date(dateStr);
  
  // 1. Récupération des cours en base de données
  const lessons = await prisma.lesson.findMany({
    where: {
      classId,
      startTime: {
        gte: startOfWeek(date, { weekStartsOn: 1 }),
        lte: endOfWeek(date, { weekStartsOn: 1 }),
      },
    },
    include: {
      subject: true,
      teacher: true,
    },
  });

  // 2. LE FORMATAGE JSON (C'est ici que ça se passe !)
  const formattedEvents = lessons.map((lesson) => ({
    id: lesson.id,
    title: `${lesson.subject.name} - ${lesson.teacher.name}`,
    start: lesson.startTime.toISOString(),
    end: lesson.endTime.toISOString(),
    // Optionnel : ajouter des couleurs selon la matière
    backgroundColor: lesson.subject.name === "Mathématiques" ? "#3b82f6" : "#10b981",
    extendedProps: {
      teacher: lesson.teacher.name,
      subject: lesson.subject.name,
    }
  }));

  return NextResponse.json(formattedEvents);
}