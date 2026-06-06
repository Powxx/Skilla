import { prisma } from "@/lib/prisma";
import { Room, Class } from "@prisma/client";
import { addHours, startOfDay, addDays } from "date-fns";

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
    // 1. Récupérer les données
    const teachers = await prisma.user.findMany({
      where: { role: "TEACHER" },
      include: { subjects: true }
    });
    const rooms = await prisma.room.findMany();
    const classes = classId 
      ? await prisma.class.findMany({ where: { id: classId } })
      : await prisma.class.findMany();
    
    // Pour cet exemple, on va simuler la génération de cours à placer
    const lessonsToPlace = await this.generateRequirements(classes);

    const timeSlots = this.generateTimeSlots(startDate);
    
    return this.runHeuristicOptimization(lessonsToPlace, teachers, rooms, timeSlots);
  }

  private static async generateRequirements(classes: Class[]): Promise<Requirement[]> {
    const subjects = await prisma.subject.findMany();
    const requirements: Requirement[] = [];
    
    for (const cls of classes) {
      for (const subject of subjects) {
        requirements.push({
          classId: cls.id,
          subjectId: subject.id,
          durationHours: 4
        });
      }
    }
    return requirements;
  }

  private static generateTimeSlots(startDate: Date) {
    const slots = [];
    const start = startOfDay(startDate);
    
    // Lundi à Vendredi, 8h-12h et 13h-17h
    for (let d = 0; d < 5; d++) {
      const day = addDays(start, d);
      // Matin
      slots.push({
        start: addHours(day, 8),
        end: addHours(day, 12)
      });
      // Après-midi
      slots.push({
        start: addHours(day, 13),
        end: addHours(day, 17)
      });
    }
    return slots;
  }

  private static runHeuristicOptimization(
    requirements: Requirement[],
    teachers: any[],
    rooms: Room[],
    timeSlots: { start: Date, end: Date }[]
  ): OptimizationResult {
    const scheduledLessons: ScheduledLesson[] = [];
    const unscheduledLessons: UnscheduledRequirement[] = [];
    const conflicts: string[] = [];

    const queue = [...requirements].sort(() => Math.random() - 0.5);

    for (const req of queue) {
      let placed = false;
      
      const availableTeachers = teachers.filter(t => 
        t.subjects.some((s: any) => s.id === req.subjectId)
      );

      if (availableTeachers.length === 0) {
        unscheduledLessons.push({ ...req, reason: "Aucun professeur pour cette matière" });
        continue;
      }

      for (const slot of timeSlots) {
        const teacher = availableTeachers.find(t => 
          !scheduledLessons.some(l => 
            l.teacherId === t.id && this.doSlotsOverlap(l, slot)
          )
        );

        if (!teacher) continue;

        const isClassBusy = scheduledLessons.some(l => 
          l.classId === req.classId && this.doSlotsOverlap(l, slot)
        );
        if (isClassBusy) continue;

        const room = rooms.find(r => 
          !scheduledLessons.some(l => 
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
          teacherName: (teacher.firstName || "") + " " + (teacher.lastName || ""),
          roomName: room.name,
          subjectName: teacher.subjects.find((s: any) => s.id === req.subjectId)?.name || "Matière"
        });
        placed = true;
        break;
      }

      if (!placed) {
        unscheduledLessons.push({ ...req, reason: "Pas de créneau ou de salle disponible" });
      }
    }

    return {
      scheduledLessons,
      unscheduledLessons,
      score: scheduledLessons.length / (requirements.length || 1),
      conflicts
    };
  }

  private static doSlotsOverlap(a: ScheduledLesson, b: { start: Date, end: Date }) {
    return (a.startTime < b.end && a.endTime > b.start);
  }
}
