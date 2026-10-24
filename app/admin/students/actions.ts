"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    throw new Error("Action réservée aux administrateurs.");
  }
  return session;
}

export async function setDispensation(studentId: string, subjectId: string, isDispensed: boolean, reason?: string) {
  await requireAdmin();

  if (isDispensed) {
    await prisma.dispensation.upsert({
      where: {
        studentId_subjectId: {
          studentId,
          subjectId
        }
      },
      update: { reason: reason?.trim() || null },
      create: { studentId, subjectId, reason: reason?.trim() || null }
    });
  } else {
    await prisma.dispensation.deleteMany({
      where: { studentId, subjectId }
    });
  }

  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath(`/admin/dispenses`);
  revalidatePath(`/student/grades`);
  return { ok: true };
}
