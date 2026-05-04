import { RhythmType } from '@prisma/client';
import { addWeeks, startOfWeek, isSameWeek } from 'date-fns';

export class PlanningService {
  /**
   * Détermine si une date donnée tombe sur une semaine de cours
   * en fonction du rythme 1/3.
   */
  static isLessonWeek(date: Date, startDate: Date, rhythm: RhythmType): boolean {
    if (rhythm === RhythmType.WEEKLY) return true;

    if (rhythm === RhythmType.ALTERNANCE_1_4) {
      const start = startOfWeek(startDate, { weekStartsOn: 1 });
      const current = startOfWeek(date, { weekStartsOn: 1 });
      
      const diffInWeeks = Math.round(
        (current.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)
      );

      // Rythme 1/4 : La semaine de cours est toutes les 4 semaines
      return diffInWeeks % 4 === 0;
    }

    return false;
  }
}