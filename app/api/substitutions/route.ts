import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { createNotification, checkEventEnabled } from "@/app/actions/notifications";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  try {
    const where: any = {};
    if (status) where.status = status;

    // Admin sees all, Teacher sees theirs
    if (session.user.role === "TEACHER") {
      where.OR = [
        { originalTeacherId: session.user.id },
        { substituteTeacherId: session.user.id }
      ];
    } else if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const requests = await prisma.substitutionRequest.findMany({
      where,
      include: {
        lesson: {
          include: {
            subject: true,
            class: true
          }
        },
        originalTeacher: { select: { firstName: true, lastName: true } },
        substituteTeacher: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(requests);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const { lessonId } = await request.json();

    const subRequest = await prisma.substitutionRequest.create({
      data: {
        lessonId,
        originalTeacherId: session.user.id,
        status: "PENDING"
      }
    });

    return NextResponse.json(subRequest);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const { id, status, substituteTeacherId, subjectId } = await request.json();

    const subRequest = await prisma.substitutionRequest.update({
      where: { id },
      data: { status, substituteTeacherId },
      include: { lesson: true }
    });

    // If approved, update the lesson's teacher and subject
    if (status === "APPROVED" && substituteTeacherId) {
      const updatedLesson = await prisma.lesson.update({
        where: { id: subRequest.lessonId },
        data: { 
          teacherId: substituteTeacherId,
          subjectId: subjectId || undefined // Change subject if provided
        },
        include: { 
          class: { include: { students: true } }, 
          subject: true,
          teacher: { select: { firstName: true, lastName: true } }
        }
      });

      // Notify Students
      const isEnabled = await checkEventEnabled("SUBSTITUTION_VALIDATED");
      if (isEnabled) {
        for (const student of updatedLesson.class.students) {
          const subjectName = updatedLesson.isFreeLesson ? (updatedLesson.customSubject || "Cours libre") : (updatedLesson.subject?.name || "Sans matière");
          createNotification({
            userId: student.id,
            title: "Remplacement validé",
            message: `M. ${updatedLesson.teacher?.lastName || "l'intervenant"} assurera le cours de ${subjectName} du ${updatedLesson.startTime.toLocaleDateString('fr-FR')}.`,
            type: "SUCCESS",
            link: "/student/planning"
          }).catch(e => console.error(e));
        }
      }
    }

    return NextResponse.json(subRequest);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
