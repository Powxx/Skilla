"use server";

import { AIPlanningService } from "@/src/services/ai-planning.service";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Server Action : Déclenche l'algorithme d'optimisation hebdomadaire par IA.
 * 
 * @param params Critères d'optimisation (semaine, classes cibles, contraintes).
 * @returns Le résultat de l'optimisation (cours planifiés, non placés, conflits, score).
 */
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

/**
 * Server Action : Enregistre de manière transactionnelle les cours générés par le planificateur IA.
 * Utilise une transaction unique pour garantir que soit TOUS les cours sont créés, soit AUCUN.
 * Gère le cas des classes combinées en créant un cours distinct pour chaque classe participante
 * afin que l'événement apparaisse dans le calendrier de tous les élèves concernés.
 * 
 * @param lessons Tableau des cours optimisés à sauvegarder.
 * @returns Un objet de succès ou lève une exception en cas d'échec.
 */
export async function saveOptimizedSchedule(lessons: any[]) {
  try {
    await prisma.$transaction(
      lessons.map(lesson => {
        // Gère les classes combinées (IDs séparés par des virgules, ex: "class1, class2")
        const classIds = String(lesson.classId).split(',').map(s => s.trim());
        
        // Crée un cours pour chaque classe participant au cours fusionné
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
      }).flat() // Aplatit la matrice de requêtes pour la transaction Prisma
    );

    // Force la régénération de la page d'administration du planning (Next.js Cache Revalidation)
    revalidatePath("/admin/planning");
    return { success: true };
  } catch (error) {
    console.error("Failed to save schedule:", error);
    throw new Error("Erreur lors de l'enregistrement du planning");
  }
}

/**
 * Server Action : Met à jour la durée d'un cycle d'alternance pour une classe spécifique.
 * 
 * @param classId ID de la classe.
 * @param cycleWeeks Nombre de semaines composant un cycle d'alternance.
 */
export async function updateClassCycle(classId: string, cycleWeeks: number) {
  await prisma.class.update({
    where: { id: classId },
    data: { cycleWeeks }
  });
  revalidatePath("/admin/planning/optimizer");
}
