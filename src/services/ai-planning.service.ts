import { prisma } from "@/lib/prisma";
import { Room, Class } from "@prisma/client";
import { addHours, startOfDay, addDays, getDay, parse, format, isBefore, isAfter, isEqual } from "date-fns";

export interface OptimizationParams {
  startDate: Date;
  classIds: string[];
  allowClassCombination: boolean;
  allowFullDay: boolean;
  maxConsecutiveLessons: number;
}

export interface OptimizationResult {
  scheduledLessons: ScheduledLesson[];
  unscheduledLessons: UnscheduledRequirement[];
  score: number;
  conflicts: string[];
}

interface Requirement {
  classId: string;
  subjectId: string;
  durationHours: number;
}

interface ScheduledLesson {
  startTime: Date;
  endTime: Date;
  subjectId: string;
  teacherId: string;
  classId: string; // May be a comma-separated list if combined
  roomId: string;
  teacherName: string;
  roomName: string;
  subjectName: string;
}

interface UnscheduledRequirement extends Requirement {
  reason: string;
}

export class AIPlanningService {
  /**
   * Optimise l'emploi du temps pour une semaine donnée avec paramètres avancés
   */
  static async optimizeWeek(params: OptimizationParams): Promise<OptimizationResult> {
    const { startDate, classIds, allowClassCombination, allowFullDay, maxConsecutiveLessons } = params;

    // 1. Récupérer les données de base
    const [teachers, rooms, classes, requirementsData, existingLessons] = await Promise.all([
      prisma.user.findMany({
        where: { role: "TEACHER" },
        include: { subjects: true, availabilities: true }
      }),
      prisma.room.findMany(),
      prisma.class.findMany({ 
        where: classIds.length > 0 ? { id: { in: classIds } } : {} 
      }),
      prisma.classSubjectRequirement.findMany({
        where: classIds.length > 0 ? { classId: { in: classIds } } : {},
        include: { subject: true }
      }),
      prisma.lesson.findMany({
        where: {
          startTime: { gte: startOfDay(startDate) },
          endTime: { lte: addDays(startOfDay(startDate), 7) }
        }
      })
    ]);
    
    // 2. Transformer les données en format de requirements interne
    const requirements: Requirement[] = requirementsData.map(r => ({
      classId: r.classId,
      subjectId: r.subjectId,
      durationHours: r.weeklyHours
    }));

    // Fallback par défaut si vide
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

    const timeSlots = this.generateTimeSlots(startDate);
    
    return this.runConstraintBasedOptimization(
      requirements, 
      teachers, 
      rooms, 
      timeSlots, 
      existingLessons,
      { allowClassCombination, allowFullDay, maxConsecutiveLessons }
    );
  }

  private static generateTimeSlots(startDate: Date) {
    const slots = [];
    const start = startOfDay(startDate);
    
    // Lundi à Vendredi, blocs de 2 heures
    // 8h-10h, 10h-12h, 13h-15h, 15h-17h
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

  private static isTeacherAvailable(teacher: any, slot: { start: Date; end: Date }) {
    // Si aucune disponibilité n'est renseignée, on suppose qu'il est disponible tout le temps
    if (!teacher.availabilities || teacher.availabilities.length === 0) return true;

    const dayOfWeek = getDay(slot.start);
    const slotStartTimeStr = format(slot.start, "HH:mm");
    const slotEndTimeStr = format(slot.end, "HH:mm");

    return teacher.availabilities.some((avail: any) => {
      if (avail.dayOfWeek !== dayOfWeek) return false;
      
      // On compare les chaînes HH:mm
      return avail.startTime <= slotStartTimeStr && avail.endTime >= slotEndTimeStr;
    });
  }

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

    // Helper to count consecutive lessons for a teacher or class
    const countConsecutive = (id: string, slot: { start: Date; end: Date }, type: 'teacher' | 'class') => {
      let count = 0;
      let currentStart = slot.start;
      
      // Check backwards
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

    // Helper to check if teacher worked today
    const workedHoursToday = (teacherId: string, date: Date) => {
      const dayStart = startOfDay(date);
      const dayEnd = addDays(dayStart, 1);
      return scheduledLessons
        .filter(l => l.teacherId === teacherId && l.startTime >= dayStart && l.startTime < dayEnd)
        .length * 2; // Assuming 2h blocks
    };

    // Group requirements by subject if combination is allowed
    // For now, let's stick to per-requirement placement but look for combination opportunities
    
    const sortedRequirements = [...requirements].sort((a, b) => {
      const teachersA = teachers.filter(t => t.subjects.some((s: any) => s.id === a.subjectId)).length;
      const teachersB = teachers.filter(t => t.subjects.some((s: any) => s.id === b.subjectId)).length;
      return teachersA - teachersB;
    });

    for (const req of sortedRequirements) {
      let remainingHours = req.durationHours;
      const blocksNeeded = Math.ceil(remainingHours / 2);

      for (let b = 0; b < blocksNeeded; b++) {
        let placed = false;
        const competentTeachers = teachers.filter(t => t.subjects.some((s: any) => s.id === req.subjectId));

        for (const slot of timeSlots) {
          // 1. Class busy?
          if ([...scheduledLessons, ...existingLessons].some(l => l.classId.includes(req.classId) && this.doSlotsOverlap(l, slot))) continue;

          // 2. Max consecutive check for class
          if (countConsecutive(req.classId, slot, 'class') >= maxConsecutiveLessons) continue;

          // 3. Find teacher
          const teacher = competentTeachers.find(t => {
            if (!this.isTeacherAvailable(t, slot)) return false;
            
            // Already busy?
            if ([...scheduledLessons, ...existingLessons].some(l => l.teacherId === t.id && this.doSlotsOverlap(l, slot))) return false;

            // Full day check
            if (!allowFullDay && workedHoursToday(t.id, slot.start) >= 4) return false;

            // Consecutive check
            if (countConsecutive(t.id, slot, 'teacher') >= maxConsecutiveLessons) return false;

            return true;
          });

          if (!teacher) continue;

          // 4. Room
          const room = rooms.find(r => ![...scheduledLessons, ...existingLessons].some(l => l.roomId === r.id && this.doSlotsOverlap(l, slot)));
          if (!room) continue;

          // 5. Combination logic (simplifiée : si une autre classe a le même besoin au même moment)
          let finalClassId = req.classId;
          if (allowClassCombination) {
             const combinableReq = sortedRequirements.find(other => 
                other.classId !== req.classId && 
                other.subjectId === req.subjectId &&
                !scheduledLessons.some(l => l.classId.includes(other.classId) && this.doSlotsOverlap(l, slot)) &&
                !existingLessons.some(l => l.classId.includes(other.classId) && this.doSlotsOverlap(l, slot))
             );
             if (combinableReq) {
                // Check if combined class has consecutive limit reached
                if (countConsecutive(combinableReq.classId, slot, 'class') < maxConsecutiveLessons) {
                   finalClassId = `${req.classId}, ${combinableReq.classId}`;
                   // Mark one block as done for the other class (hacky for this heuristic)
                   // In a real solver, we'd handle this better
                }
             }
          }

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
          break;
        }

        if (!placed) unscheduledLessons.push({ ...req, durationHours: 2, reason: "Contraintes strictes (Enchaînement, Journée, Dispo)" });
      }
    }

    const totalBlocksRequested = requirements.reduce((acc, r) => acc + Math.ceil(r.durationHours / 2), 0);
    return { scheduledLessons, unscheduledLessons, score: scheduledLessons.length / (totalBlocksRequested || 1), conflicts };
  }

  private static doSlotsOverlap(a: any, b: { start: Date, end: Date }) {
    const aStart = new Date(a.startTime || a.start);
    const aEnd = new Date(a.endTime || a.end);
    return (aStart < b.end && aEnd > b.start);
  }
}
