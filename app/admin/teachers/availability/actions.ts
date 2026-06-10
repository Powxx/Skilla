"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addTeacherAvailability(teacherId: string, dayOfWeek: number, startTime: string, endTime: string) {
  await prisma.teacherAvailability.create({
    data: { teacherId, dayOfWeek, startTime, endTime }
  });
  revalidatePath("/admin/teachers/availability");
}

export async function deleteTeacherAvailability(id: string) {
  await prisma.teacherAvailability.delete({ where: { id } });
  revalidatePath("/admin/teachers/availability");
}
