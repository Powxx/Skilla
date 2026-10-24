import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { createNotification, checkEventEnabled } from "@/app/actions/notifications";
import { getEffectiveTeacherId } from "@/lib/teacher-utils";

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
  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const { lessonId } = await request.json();
    if (!lessonId) {
      return NextResponse.json({ error: "ID du cours manquant." }, { status: 400 });
    }

    const effectiveTeacherId = await getEffectiveTeacherId(session.user.id);
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, teacherId: true, isCancelled: true }
    });

    if (!lesson) {
      return NextResponse.json({ error: "Cours introuvable." }, { status: 404 });
    }

    const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin && lesson.teacherId !== effectiveTeacherId) {
      return NextResponse.json({ error: "Vous ne pouvez demander un remplacement que pour vos propres cours." }, { status: 403 });
    }

    const existingPending = await prisma.substitutionRequest.findFirst({
      where: { lessonId, status: "PENDING" }
    });
    if (existingPending) {
      return NextResponse.json({ error: "Une demande de remplacement est déjà en attente pour ce cours." }, { status: 400 });
    }

    const subRequest = await prisma.substitutionRequest.create({
      data: {
        lessonId,
        originalTeacherId: effectiveTeacherId,
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

    const [subRequest, updatedLesson] = await prisma.$transaction(async (tx) => {
      const subReq = await tx.substitutionRequest.update({
        where: { id },
        data: { status, substituteTeacherId },
        include: { lesson: true }
      });

      let lessonUpdated = null;
      if (status === "APPROVED" && substituteTeacherId) {
        lessonUpdated = await tx.lesson.update({
          where: { id: subReq.lessonId },
          data: { 
            substituteId: substituteTeacherId,
            subjectId: subjectId || undefined
          },
          include: { 
            class: { include: { students: true } }, 
            subject: true,
            teacher: { select: { firstName: true, lastName: true } },
            substitute: { select: { firstName: true, lastName: true } }
          }
        });
      }
      return [subReq, lessonUpdated];
    });

    // Notification des élèves si le remplacement est validé
    if (status === "APPROVED" && updatedLesson) {
      const isEnabled = await checkEventEnabled("SUBSTITUTION_VALIDATED");
      if (isEnabled) {
        const subjectName = updatedLesson.isFreeLesson ? (updatedLesson.customSubject || "Cours libre") : (updatedLesson.subject?.name || "Sans matière");
        const subTeacherName = updatedLesson.substitute?.lastName || updatedLesson.teacher?.lastName || "l'intervenant";
        
        for (const student of updatedLesson.class.students) {
          createNotification({
            userId: student.id,
            title: "Remplacement validé",
            message: `M. ${subTeacherName} assurera le cours de ${subjectName} du ${updatedLesson.startTime.toLocaleDateString('fr-FR')}.`,
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
