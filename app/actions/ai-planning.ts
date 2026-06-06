"use server";

import { AIPlanningService } from "@/src/services/ai-planning.service";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function runOptimization(startDate: Date, classId?: string) {
  try {
    const result = await AIPlanningService.optimizeWeek(startDate, classId);
    return result;
  } catch (error) {
    console.error("Optimization failed:", error);
    throw new Error("Erreur lors de l'optimisation");
  }
}

export async function saveOptimizedSchedule(lessons: any[]) {
  try {
    await prisma.$transaction(
      lessons.map(lesson => 
        prisma.lesson.create({
          data: {
            startTime: new Date(lesson.startTime),
            endTime: new Date(lesson.endTime),
            subjectId: lesson.subjectId,
            teacherId: lesson.teacherId,
            classId: lesson.classId,
            roomId: lesson.roomId,
          }
        })
      )
    );
    revalidatePath("/admin/planning");
    return { success: true };
  } catch (error) {
    console.error("Failed to save schedule:", error);
    throw new Error("Erreur lors de l'enregistrement du planning");
  }
}
