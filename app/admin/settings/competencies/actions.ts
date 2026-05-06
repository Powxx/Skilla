"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createClassCompetency(data: { classId: string, name: string }) {
  await prisma.$transaction([
    prisma.classCompetency.create({ data: { ...data, category: "SCHOOL" } }),
    prisma.classCompetency.create({ data: { ...data, category: "ENTERPRISE" } })
  ]);
  revalidatePath("/admin/settings/competencies");
}

export async function deleteClassCompetency(id: string) {
  await prisma.classCompetency.delete({ where: { id } });
  revalidatePath("/admin/settings/competencies");
}
