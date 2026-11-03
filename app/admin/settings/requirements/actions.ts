"use server";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  return requirePermission("canManageSettings");
}

export async function updateClassRequirement(classId: string, subjectId: string, weeklyHours: number) {
  await requireAdmin();
  const safeHours = Math.max(0, Number(weeklyHours) || 0);

  await prisma.classSubjectRequirement.upsert({
    where: {
      classId_subjectId: {
        classId,
        subjectId
      }
    },
    update: { weeklyHours: safeHours },
    create: { classId, subjectId, weeklyHours: safeHours }
  });
  revalidatePath("/admin/settings/requirements");
}

export async function deleteClassRequirement(id: string) {
  await requireAdmin();
  await prisma.classSubjectRequirement.delete({ where: { id } });
  revalidatePath("/admin/settings/requirements");
}
