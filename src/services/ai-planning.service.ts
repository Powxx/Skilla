import { prisma } from "@/lib/prisma";
import { Room, Class } from "@prisma/client";
import { addHours, startOfDay, addDays, getDay, parse, format, isBefore, isAfter, isEqual } from "date-fns";

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
  classId: string;
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
   * Optimise l'emploi du temps pour une semaine donnée
   */
  static async optimizeWeek(startDate: Date, classId?: string): Promise<OptimizationResult> {
    // 1. Récupérer les données de base
    const [teachers, rooms, classes, requirementsData, existingLessons] = await Promise.all([
      prisma.user.findMany({
        where: { role: "TEACHER" },
        include: { subjects: true, availabilities: true }
      }),
      prisma.room.findMany(),
      classId 
        ? prisma.class.findMany({ where: { id: classId } })
        : prisma.class.findMany(),
      prisma.classSubjectRequirement.findMany({
        where: classId ? { classId } : {},
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

    // Si aucune contrainte n'est définie en base pour une classe, on en génère par défaut pour le test
    if (requirements.length === 0) {
      const subjects = await prisma.subject.findMany();
      for (const cls of classes) {
        for (const subject of subjects) {
          requirements.push({
            classId: cls.id,
            subjectId: subject.id,
            durationHours: 4 // Par défaut 4h
          });
        }
      }
    }

    const timeSlots = this.generateTimeSlots(startDate);
    
    return this.runConstraintBasedOptimization(requirements, teachers, rooms, timeSlots, existingLessons);
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
    existingLessons: any[]
  ): OptimizationResult {
    const scheduledLessons: ScheduledLesson[] = [];
    const unscheduledLessons: UnscheduledRequirement[] = [];
    const conflicts: string[] = [];

    // Trier les besoins par "difficulté"
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
        
        const competentTeachers = teachers.filter(t => 
          t.subjects.some((s: any) => s.id === req.subjectId)
        );

        for (const slot of timeSlots) {
          // 1. Vérifier si la classe est libre
          const isClassBusy = [...scheduledLessons, ...existingLessons].some(l => 
            l.classId === req.classId && this.doSlotsOverlap(l, slot)
          );
          if (isClassBusy) continue;

          // 2. Trouver un prof libre, compétent ET disponible sur ce créneau horaire
          const teacher = competentTeachers.find(t => 
            this.isTeacherAvailable(t, slot) &&
            ![...scheduledLessons, ...existingLessons].some(l => 
              l.teacherId === t.id && this.doSlotsOverlap(l, slot)
            )
          );
          if (!teacher) continue;

          // 3. Trouver une salle libre
          const room = rooms.find(r => 
            ![...scheduledLessons, ...existingLessons].some(l => 
              l.roomId === r.id && this.doSlotsOverlap(l, slot)
            )
          );
          if (!room) continue;

          scheduledLessons.push({
            startTime: slot.start,
            endTime: slot.end,
            subjectId: req.subjectId,
            teacherId: teacher.id,
            classId: req.classId,
            roomId: room.id,
            teacherName: `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim(),
            roomName: room.name,
            subjectName: teacher.subjects.find((s: any) => s.id === req.subjectId)?.name || "Matière"
          });
          placed = true;
          remainingHours -= 2;
          break;
        }

        if (!placed) {
          unscheduledLessons.push({ ...req, durationHours: 2, reason: "Conflit Prof (dispo/déjà pris), Salle ou Classe" });
        }
      }
    }

    const totalBlocksRequested = requirements.reduce((acc, r) => acc + Math.ceil(r.durationHours / 2), 0);
    const score = scheduledLessons.length / (totalBlocksRequested || 1);

    return {
      scheduledLessons,
      unscheduledLessons,
      score,
      conflicts
    };
  }

  private static doSlotsOverlap(a: any, b: { start: Date, end: Date }) {
    const aStart = new Date(a.startTime || a.start);
    const aEnd = new Date(a.endTime || a.end);
    return (aStart < b.end && aEnd > b.start);
  }
}
