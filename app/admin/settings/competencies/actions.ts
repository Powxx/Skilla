"use server";

import prisma from "@/lib/prisma";
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

export async function createClassCompetency(data: { classId: string, name: string, category?: string }) {
  await requireAdmin();
  if (!data.classId || !data.name?.trim()) {
    throw new Error("Classe et intitulé de la compétence obligatoires.");
  }

  const name = data.name.trim();

  if (data.category) {
    await prisma.classCompetency.create({ 
      data: { 
        classId: data.classId, 
        name, 
        category: data.category 
      } 
    });
  } else {
    await prisma.$transaction([
      prisma.classCompetency.create({ data: { classId: data.classId, name, category: "SCHOOL" } }),
      prisma.classCompetency.create({ data: { classId: data.classId, name, category: "ENTERPRISE" } })
    ]);
  }
  revalidatePath("/admin/settings/competencies");
  revalidatePath("/admin/livret");
}

export async function deleteClassCompetency(id: string) {
  await requireAdmin();
  await prisma.classCompetency.delete({ where: { id } });
  revalidatePath("/admin/settings/competencies");
}
