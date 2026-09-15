"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";

export async function getAvailableTeachersForLinking() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    throw new Error("Accès réservé aux administrateurs.");
  }

  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER", isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      name: true,
      subjects: { select: { name: true } }
    },
    orderBy: { lastName: "asc" }
  });

  return teachers;
}

export async function getAdminLinkedTeacher() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      linkedTeacherId: true,
      linkedTeacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          name: true
        }
      }
    }
  });

  return user?.linkedTeacher || null;
}

export async function linkAdminToTeacher(teacherId: string | null) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return { ok: false, error: "Non autorisé" };
  }

  if (teacherId) {
    const teacher = await prisma.user.findFirst({
      where: { id: teacherId, role: "TEACHER" }
    });
    if (!teacher) {
      return { ok: false, error: "Professeur introuvable." };
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { linkedTeacherId: teacherId }
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
