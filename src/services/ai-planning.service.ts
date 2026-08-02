import { prisma } from "@/lib/prisma";
import { Room, Class } from "@prisma/client";
import { addHours, startOfDay, addDays, getDay, format } from "date-fns";

/**
 * Paramètres configurables pour l'algorithme d'optimisation
 */
export interface OptimizationParams {
  startDate: Date;                  /// Date de début de la semaine à optimiser (généralement un lundi)
  classIds: string[];               /// IDs des classes à inclure dans la planification
  allowClassCombination: boolean;   /// Autoriser la fusion de deux classes ayant le même cours
  allowFullDay: boolean;            /// Autoriser un enseignant à travailler plus de 4 heures par jour
  maxConsecutiveLessons: number;    /// Limite maximale de cours consécutifs pour un prof/classe (en blocs de 2h)
}

/**
 * Résultat retourné par le planificateur automatique
 */
export interface OptimizationResult {
  scheduledLessons: ScheduledLesson[];     /// Liste des cours qui ont pu être planifiés avec succès
  unscheduledLessons: UnscheduledRequirement[]; /// Besoins d'heures qui n'ont pas trouvé de créneau
  score: number;                            /// Taux de réussite (cours planifiés / cours demandés)
  conflicts: string[];                      /// Liste textuelle des conflits identifiés
}

/**
 * Besoin d'heures de cours pour une classe et une matière
 */
interface Requirement {
  classId: string;
  subjectId: string;
  durationHours: number;
}

/**
 * Représentation d'un cours planifié généré par l'algorithme
 */
interface ScheduledLesson {
  startTime: Date;
  endTime: Date;
  subjectId: string;
  teacherId: string;
  classId: string; // Peut être une liste séparée par des virgules si fusion de classes
  roomId: string;
  teacherName: string;
  roomName: string;
  subjectName: string;
}

/**
 * Besoin d'heures n'ayant pas pu être planifié
 */
interface UnscheduledRequirement extends Requirement {
  reason: string;
}

/**
 * Service de Planification Automatique par Intelligence Artificielle.
 * Implémente un algorithme de résolution par contraintes (CSP heuristique)
 * pour allouer des enseignants, des salles et des créneaux horaires aux classes.
 */
export class AIPlanningService {
  /**
   * Optimise l'emploi du temps pour une semaine donnée avec paramètres avancés.
   * 
   * @param params Paramètres de filtrage et contraintes configurés par l'administrateur.
   * @returns Un objet OptimizationResult résumant le planning proposé.
   */
  static async optimizeWeek(params: OptimizationParams): Promise<OptimizationResult> {
    const { startDate, classIds, allowClassCombination, allowFullDay, maxConsecutiveLessons } = params;

    // 1. Récupérer les données de base en base de données
    const [teachers, rooms, classes, requirementsData, existingLessons] = await Promise.all([
      // Enseignants actifs avec leurs matières enseignées et disponibilités hebdomadaires
      prisma.user.findMany({
        where: { role: "TEACHER", isActive: true },
        include: { subjects: true, availabilities: true }
      }),
      // Salles disponibles
      prisma.room.findMany(),
      // Classes ciblées
      prisma.class.findMany({ 
        where: classIds.length > 0 ? { id: { in: classIds } } : {} 
      }),
      // Besoins d'heures de cours hebdomadaires (définis par matière et classe)
      prisma.classSubjectRequirement.findMany({
        where: classIds.length > 0 ? { classId: { in: classIds } } : {},
        include: { subject: true }
      }),
      // Cours déjà programmés manuellement ou verrouillés pour cette semaine
      prisma.lesson.findMany({
        where: {
          startTime: { gte: startOfDay(startDate) },
          endTime: { lte: addDays(startOfDay(startDate), 7) }
        }
      })
    ]);
    
    // 2. Transformer les exigences de la base de données en format de requirement interne
    const requirements: Requirement[] = requirementsData.map(r => ({
      classId: r.classId,
      subjectId: r.subjectId,
      durationHours: r.weeklyHours
    }));

    // Fallback par défaut si aucune exigence n'est configurée (génère 4h par matière pour chaque classe)
    if (requirements.length === 0) {
      const subjects = await prisma.subject.findMany();
      for (const cls of classes) {
        for (const subject of subjects) {
          requirements.push({
            classId: cls.id,
            subjectId: subject.id,
            durationHours: 4
          });
        }
      }
    }

    // 3. Générer les créneaux horaires de cours disponibles pour la semaine (du lundi au vendredi)
    const timeSlots = this.generateTimeSlots(startDate);
    
    // 4. Lancer l'algorithme heuristique basé sur la satisfaction de contraintes
    return this.runConstraintBasedOptimization(
      requirements, 
      teachers, 
      rooms, 
      timeSlots, 
      existingLessons,
      { allowClassCombination, allowFullDay, maxConsecutiveLessons }
    );
  }

  /**
   * Génère les créneaux horaires standards d'une semaine de cours (Lundi-Vendredi).
   * Par défaut : blocs de 2 heures (8h-10h, 10h-12h, 13h-15h, 15h-17h).
   */
  private static generateTimeSlots(startDate: Date) {
    const slots = [];
    const start = startOfDay(startDate);
    
    // Lundi à Vendredi (0 à 4)
    for (let d = 0; d < 5; d++) {
      const day = addDays(start, d);
      const daySlots = [
        { h: 8, duration: 2 },
        { h: 10, duration: 2 },
        { h: 13, duration: 2 },
        { h: 15, duration: 2 }
      ];

      for (const s of daySlots) {
        slots.push({
          start: addHours(day, s.h),
          end: addHours(day, s.h + s.duration)
        });
      }
    }
    return slots;
  }

  /**
   * Vérifie si un enseignant est disponible sur un créneau donné en fonction
   * de sa grille hebdomadaire d'availabilités.
   */
  private static isTeacherAvailable(teacher: any, slot: { start: Date; end: Date }) {
    // Si l'enseignant n'a pas défini de préférences, on considère qu'il est disponible par défaut
    if (!teacher.availabilities || teacher.availabilities.length === 0) return true;

    const dayOfWeek = getDay(slot.start);
    const slotStartTimeStr = format(slot.start, "HH:mm");
    const slotEndTimeStr = format(slot.end, "HH:mm");

    return teacher.availabilities.some((avail: any) => {
      if (avail.dayOfWeek !== dayOfWeek) return false;
      
      // Comparaison des chaînes horaires (ex: "08:00" <= "08:00" et "10:00" >= "10:00")
      return avail.startTime <= slotStartTimeStr && avail.endTime >= slotEndTimeStr;
    });
  }

  /**
   * Algorithme Heuristique Glouton de planification sous contraintes.
   * Il trie les besoins par difficulté d'allocation (nombre de professeurs éligibles restreint)
   * et affecte chaque cours en respectant les priorités.
   */
  private static runConstraintBasedOptimization(
    requirements: Requirement[],
    teachers: any[],
    rooms: Room[],
    timeSlots: { start: Date, end: Date }[],
    existingLessons: any[],
    params: { allowClassCombination: boolean; allowFullDay: boolean; maxConsecutiveLessons: number }
  ): OptimizationResult {
    const { allowClassCombination, allowFullDay, maxConsecutiveLessons } = params;
    const scheduledLessons: ScheduledLesson[] = [];
    const unscheduledLessons: UnscheduledRequirement[] = [];
    const conflicts: string[] = [];

    /**
     * Compte le nombre de blocs consécutifs d'enseignement déjà affectés
     * juste avant le créneau cible pour un professeur ou une classe.
     */
    const countConsecutive = (id: string, slot: { start: Date; end: Date }, type: 'teacher' | 'class') => {
      let count = 0;
      let currentStart = slot.start;
      
      // Recherche à rebours dans le planning temporaire
      while (true) {
        const prevEnd = currentStart;
        const found = scheduledLessons.find(l => 
          (type === 'teacher' ? l.teacherId === id : l.classId.includes(id)) && 
          l.endTime.getTime() === prevEnd.getTime()
        );
        if (!found) break;
        count++;
        currentStart = found.startTime;
      }
      return count;
    };

    /**
     * Calcule le nombre total d'heures de travail affectées à un professeur pour la journée en cours.
     */
    const workedHoursToday = (teacherId: string, date: Date) => {
      const dayStart = startOfDay(date);
      const dayEnd = addDays(dayStart, 1);
      return scheduledLessons
        .filter(l => l.teacherId === teacherId && l.startTime >= dayStart && l.startTime < dayEnd)
        .length * 2; // Hypothèse d'un bloc de 2h par cours
    };

    // HEURISTIQUE MRV (Minimum Remaining Values) :
    // On trie les besoins de cours. Ceux qui ont le moins d'enseignants qualifiés (les plus difficiles à planifier)
    // sont traités en premier pour éviter d'être bloqués à la fin.
    const sortedRequirements = [...requirements].sort((a, b) => {
      const teachersA = teachers.filter(t => t.subjects.some((s: any) => s.id === a.subjectId)).length;
      const teachersB = teachers.filter(t => t.subjects.some((s: any) => s.id === b.subjectId)).length;
      return teachersA - teachersB;
    });

    // Parcourir chaque besoin
    for (const req of sortedRequirements) {
      let remainingHours = req.durationHours;
      const blocksNeeded = Math.ceil(remainingHours / 2); // Divise en blocs standards de 2 heures

      for (let b = 0; b < blocksNeeded; b++) {
        let placed = false;
        // Filtrer les profs qualifiés pour enseigner cette matière
        const competentTeachers = teachers.filter(t => t.subjects.some((s: any) => s.id === req.subjectId));

        // Parcourir les créneaux disponibles de la semaine
        for (const slot of timeSlots) {
          // 1. Contrainte de classe : La classe est-elle déjà occupée à cette heure ?
          if ([...scheduledLessons, ...existingLessons].some(l => l.classId.includes(req.classId) && this.doSlotsOverlap(l, slot))) continue;

          // 2. Contrainte d'enchaînement de la classe (limite max consecutive)
          if (countConsecutive(req.classId, slot, 'class') >= maxConsecutiveLessons) continue;

          // 3. Trouver un enseignant qualifié disponible
          const teacher = competentTeachers.find(t => {
            // Est-il disponible selon sa grille de préférences ?
            if (!this.isTeacherAvailable(t, slot)) return false;
            
            // Est-il déjà affecté à un autre cours au même moment ?
            if ([...scheduledLessons, ...existingLessons].some(l => l.teacherId === t.id && this.doSlotsOverlap(l, slot))) return false;

            // Limite de travail quotidienne (4 heures max par jour si non autorisé à faire une journée complète)
            if (!allowFullDay && workedHoursToday(t.id, slot.start) >= 4) return false;

            // Limite de cours consécutifs pour le professeur
            if (countConsecutive(t.id, slot, 'teacher') >= maxConsecutiveLessons) return false;

            return true;
          });

          if (!teacher) continue;

          // 4. Trouver une salle de classe libre sur ce créneau
          const room = rooms.find(r => ![...scheduledLessons, ...existingLessons].some(l => l.roomId === r.id && this.doSlotsOverlap(l, slot)));
          if (!room) continue;

          // 5. Logique de fusion/combinaison de classes
          let finalClassId = req.classId;
          if (allowClassCombination) {
             // Cherche si une autre classe a le même besoin de matière sur ce créneau libre
             const combinableReq = sortedRequirements.find(other => 
                other.classId !== req.classId && 
                other.subjectId === req.subjectId &&
                !scheduledLessons.some(l => l.classId.includes(other.classId) && this.doSlotsOverlap(l, slot)) &&
                !existingLessons.some(l => l.classId.includes(other.classId) && this.doSlotsOverlap(l, slot))
             );
             if (combinableReq) {
                // Vérifie que l'autre classe ne dépasse pas sa limite d'enchaînement consécutif
                if (countConsecutive(combinableReq.classId, slot, 'class') < maxConsecutiveLessons) {
                   finalClassId = `${req.classId}, ${combinableReq.classId}`;
                   // NOTE : Dans un solveur avancé, on décompterait également 2h du besoin de l'autre classe.
                }
             }
          }

          // Validation finale : ajout du cours planifié au planning temporaire de la semaine
          scheduledLessons.push({
            startTime: slot.start,
            endTime: slot.end,
            subjectId: req.subjectId,
            teacherId: teacher.id,
            classId: finalClassId,
            roomId: room.id,
            teacherName: `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim(),
            roomName: room.name,
            subjectName: teacher.subjects.find((s: any) => s.id === req.subjectId)?.name || "Matière"
          });
          placed = true;
          break; // Sortie du parcours des créneaux pour ce bloc, passage au bloc suivant
        }

        // Si le bloc n'a pas pu être placé après avoir testé tous les créneaux
        if (!placed) {
          unscheduledLessons.push({ 
            ...req, 
            durationHours: 2, 
            reason: "Contraintes strictes (Enchaînement, Journée, Disponibilité enseignant ou indisponibilité salle)" 
          });
        }
      }
    }

    const totalBlocksRequested = requirements.reduce((acc, r) => acc + Math.ceil(r.durationHours / 2), 0);
    
    // Calcul du score global d'allocation (pourcentage de réussite)
    return { 
      scheduledLessons, 
      unscheduledLessons, 
      score: scheduledLessons.length / (totalBlocksRequested || 1), 
      conflicts 
    };
  }

  /**
   * Vérifie si deux créneaux temporels se chevauchent.
   */
  private static doSlotsOverlap(a: any, b: { start: Date, end: Date }) {
    const aStart = new Date(a.startTime || a.start);
    const aEnd = new Date(a.endTime || a.end);
    return (aStart < b.end && aEnd > b.start);
  }
}
