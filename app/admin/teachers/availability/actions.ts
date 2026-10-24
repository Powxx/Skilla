"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";

async function requireAdminOrSelf(teacherId?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé. Veuillez vous connecter.");
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  const isSelf = Boolean(teacherId && session.user.id === teacherId);
  if (!isAdmin && !isSelf) {
    throw new Error("Action réservée aux administrateurs ou à l'enseignant concerné.");
  }
  return session;
}

export async function addTeacherAvailability(teacherId: string, dayOfWeek: number, startTime: string, endTime: string) {
  await requireAdminOrSelf(teacherId);

  await prisma.teacherAvailability.create({
    data: { teacherId, dayOfWeek, startTime, endTime }
  });
  revalidatePath("/admin/teachers/availability");
  revalidatePath("/prof/planning");
}

export async function deleteTeacherAvailability(id: string) {
  const session = await requireAdminOrSelf();
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";

  if (!isAdmin) {
    const existing = await prisma.teacherAvailability.findUnique({ where: { id } });
    if (!existing || existing.teacherId !== session.user.id) {
      throw new Error("Vous ne pouvez supprimer que vos propres disponibilités.");
    }
  }

  await prisma.teacherAvailability.delete({ where: { id } });
  revalidatePath("/admin/teachers/availability");
  revalidatePath("/prof/planning");
}
