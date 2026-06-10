"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateClassRequirement(classId: string, subjectId: string, weeklyHours: number) {
  await prisma.classSubjectRequirement.upsert({
    where: {
      classId_subjectId: {
        classId,
        subjectId
      }
    },
    update: { weeklyHours },
    create: { classId, subjectId, weeklyHours }
  });
  revalidatePath("/admin/settings/requirements");
}

export async function deleteClassRequirement(id: string) {
  await prisma.classSubjectRequirement.delete({ where: { id } });
  revalidatePath("/admin/settings/requirements");
}
