"use server";

import { AIPlanningService } from "@/src/services/ai-planning.service";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function runOptimization(params: {
  startDate: Date;
  classIds: string[];
  allowClassCombination: boolean;
  allowFullDay: boolean;
  maxConsecutiveLessons: number;
}) {
  try {
    const result = await AIPlanningService.optimizeWeek(params);
    return result;
  } catch (error) {
    console.error("Optimization failed:", error);
    throw new Error("Erreur lors de l'optimisation");
  }
}

export async function saveOptimizedSchedule(lessons: any[]) {
  try {
    await prisma.$transaction(
      lessons.map(lesson => {
        // Handle combined classes (comma separated)
        const classIds = String(lesson.classId).split(',').map(s => s.trim());
        
        // Note: For now, if combined, we create one lesson. 
        // In the future, you might want to create one per class if they are distinct events.
        // But usually, combined = same room, same time, same teacher.
        // We'll use the first classId for the main relation, and maybe add a field for others?
        // Let's stick to creating ONE lesson for the first class for simplicity, 
        // OR better: create one lesson per class so it appears in everyone's calendar.
        
        return classIds.map(clId => 
          prisma.lesson.create({
            data: {
              startTime: new Date(lesson.startTime),
              endTime: new Date(lesson.endTime),
              subjectId: lesson.subjectId,
              teacherId: lesson.teacherId,
              classId: clId,
              roomId: lesson.roomId,
            }
          })
        );
      }).flat()
    );
    revalidatePath("/admin/planning");
    return { success: true };
  } catch (error) {
    console.error("Failed to save schedule:", error);
    throw new Error("Erreur lors de l'enregistrement du planning");
  }
}

export async function updateClassCycle(classId: string, cycleWeeks: number) {
  await prisma.class.update({
    where: { id: classId },
    data: { cycleWeeks }
  });
  revalidatePath("/admin/planning/optimizer");
}
