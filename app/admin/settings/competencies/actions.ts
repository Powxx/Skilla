"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createClassCompetency(data: { classId: string, name: string, category?: string }) {
  if (data.category) {
    await prisma.classCompetency.create({ 
      data: { 
        classId: data.classId, 
        name: data.name, 
        category: data.category 
      } 
    });
  } else {
    await prisma.$transaction([
      prisma.classCompetency.create({ data: { ...data, category: "SCHOOL" } }),
      prisma.classCompetency.create({ data: { ...data, category: "ENTERPRISE" } })
    ]);
  }
  revalidatePath("/admin/settings/competencies");
  revalidatePath("/admin/livret");
}

export async function deleteClassCompetency(id: string) {
  await prisma.classCompetency.delete({ where: { id } });
  revalidatePath("/admin/settings/competencies");
}
