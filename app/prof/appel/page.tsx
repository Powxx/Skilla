import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { startOfDay, endOfDay } from "date-fns";
import AppelClient from "./appel-client";

import { getEffectiveTeacherId } from "@/lib/teacher-utils";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Faire l'appel — Professeur",
};

export default async function ProfAppelPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const effectiveTeacherId = await getEffectiveTeacherId(session.user.id);

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  // Fetch lessons for today + all past unvalidated lessons for this teacher
  // In case of a replacement, the substitute teacher (substituteId) must have the roll call, not the original teacher.
  const lessons = await prisma.lesson.findMany({
    where: {
      OR: [
        { substituteId: effectiveTeacherId },
        { teacherId: effectiveTeacherId, substituteId: null }
      ],
      isFreeLesson: false,
      isCancelled: false,
      AND: [
        {
          OR: [
            {
              startTime: {
                gte: todayStart,
                lte: todayEnd,
              },
            },
            {
              startTime: {
                lt: todayStart,
              },
              isAttendanceValidated: false,
            }
          ]
        }
      ]
    },
    include: {
      class: { select: { id: true, name: true } },
      subject: { select: { name: true } },
      room: { select: { name: true } },
    },
    orderBy: { startTime: "desc" },
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Faire l'appel
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Sélectionnez un cours pour enregistrer les absences et les retards.
          </p>
        </header>

        <AppelClient initialLessons={lessons} />
      </div>
    </div>
  );
}
