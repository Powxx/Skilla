"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateSkillLevel(studentId: string, competencyName: string, level: number) {
  await prisma.evaluation.upsert({
    where: {
      // Evaluation doesn't have a unique key for student+competency in schema, 
      // but we search by it.
      id: (await prisma.evaluation.findFirst({
        where: { studentId, competency: competencyName },
        select: { id: true }
      }))?.id || 'temp-eval-id'
    },
    update: { level },
    create: {
      studentId,
      competency: competencyName,
      level,
      source: "TEACHER_EVAL"
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
