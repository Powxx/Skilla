"use server";

import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";

export type SubmitRollPayload = {
  classId: string;
  markings: Record<string, "present" | "absent" | "late">;
};

export type SubmitRollResult =
  | { ok: true; created: number }
  | { ok: false; error: string };

/**
 * Crée uniquement les `Attendance` pour les élèves marqués absent ou retard.
 * Par défaut côté UI : tous « présents » ne sont pas envoyés ou envoyés présents ignorés.
 */
export async function submitRollCall(payload: SubmitRollPayload): Promise<SubmitRollResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TEACHER") {
    return { ok: false, error: "Accès réservé aux enseignants." };
  }

  const classId = payload.classId?.trim();
  if (!classId) {
    return { ok: false, error: "Classe requise." };
  }

  const classe = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      students: { select: { id: true } },
    },
  });

  if (!classe) {
    return { ok: false, error: "Classe introuvable." };
  }

  const toCreate: Array<{
    studentId: string;
    type: string;
    status: string;
    date: Date;
  }> = [];

  const now = new Date();

  for (const { id } of classe.students) {
    const mark = payload.markings[id] ?? "present";
    if (mark === "present") continue;

    const typeStr = mark === "absent" ? "ABSENCE" : "RETARD";
    toCreate.push({
      studentId: id,
      type: typeStr,
      status: "NON_JUSTIFIE",
      date: now,
    });
  }

  if (toCreate.length === 0) {
    return { ok: true, created: 0 };
  }

  await prisma.attendance.createMany({
    data: toCreate.map((row) => ({
      studentId: row.studentId,
      type: row.type,
      status: row.status,
      date: row.date,
    })),
  });

  revalidatePath("/prof/appel");
  revalidatePath("/student/dashboard");
  revalidatePath("/student/absences");

  return { ok: true, created: toCreate.length };
}
