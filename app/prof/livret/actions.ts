"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateSkillLevel(studentId: string, competencyName: string, level: number, category: string = "SCHOOL") {
  await prisma.evaluation.upsert({
    where: {
      id: (await prisma.evaluation.findFirst({
        where: { studentId, competency: competencyName, category },
        select: { id: true }
      }))?.id || 'temp-eval-id'
    },
    update: { level },
    create: {
      studentId,
      competency: competencyName,
      level,
      source: category === "SCHOOL" ? "TEACHER_EVAL" : "EMPLOYER_EVAL",
      category
    }
  });

  revalidatePath("/prof/livret");
  revalidatePath("/student/livret");
  revalidatePath("/employer/livret");
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
