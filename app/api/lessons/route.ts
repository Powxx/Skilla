import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek } from "date-fns";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import type { Role } from "@prisma/client";

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
      subject: true,
      teacher: true,
      class: true,
    },
  });

  const formattedEvents = lessons.map((lesson) => ({
    id: lesson.id,
    title: `${lesson.subject.name} - ${lesson.teacher.name} (${lesson.class.name})`,
    start: lesson.startTime.toISOString(),
    end: lesson.endTime.toISOString(),
    backgroundColor: "#3b82f6", // Default color
    extendedProps: {
      teacher: lesson.teacher.name,
      teacherId: lesson.teacherId,
      subject: lesson.subject.name,
      subjectId: lesson.subjectId,
      class: lesson.class.name,
      classId: lesson.classId,
    }
  }));

  return NextResponse.json(formattedEvents);
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
      }
    });
    return NextResponse.json(newLesson);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { id, ...updateData } = data;
    
    if (updateData.startTime) updateData.startTime = new Date(updateData.startTime);
    if (updateData.endTime) updateData.endTime = new Date(updateData.endTime);

    const updatedLesson = await prisma.lesson.update({
      where: { id },
      data: updateData,
    });
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