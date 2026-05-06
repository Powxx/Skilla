"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateSkillLevel(studentId: string, competencyName: string, level: number, category: string = "SCHOOL") {
  const existing = await prisma.evaluation.findFirst({
    where: { studentId, competency: competencyName, category },
    select: { id: true }
  });

  if (existing) {
    await prisma.evaluation.update({
      where: { id: existing.id },
      data: { level, source: category === "SCHOOL" ? "TEACHER_EVAL" : "EMPLOYER_EVAL" }
    });
  } else {
    await prisma.evaluation.create({
      data: {
        studentId,
        competency: competencyName,
        level,
        source: category === "SCHOOL" ? "TEACHER_EVAL" : "EMPLOYER_EVAL",
        category
      }
    });
  }

  revalidatePath("/prof/livret");
  revalidatePath("/student/livret");
  revalidatePath("/employer/livret");
  revalidatePath("/admin/recap/competencies");
}

export async function addCompetency(studentId: string, competencyName: string) {
  await prisma.evaluation.create({
    data: {
      studentId,
      competency: competencyName,
      level: 1,
      source: "TEACHER_EVAL"
    }
  });
  revalidatePath("/prof/livret");
}
