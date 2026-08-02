import { RhythmType } from '@prisma/client';
import { addWeeks, startOfWeek, isSameWeek } from 'date-fns';

/**
 * Service de gestion de la logique d'agenda et d'alternance.
 * Fournit des utilitaires pour calculer la répartition des cours dans le temps.
 */
export class PlanningService {
  /**
   * Détermine si une date donnée tombe sur une semaine de cours en présentiel
   * à l'école en fonction du rythme d'alternance de la classe.
   * 
   * @param date La date à tester (journée du cours)
   * @param startDate La date de début de l'année scolaire / du cycle
   * @param rhythm Le rythme d'alternance (Hebdomadaire, 1/3, 1/4)
   * @returns true si la classe a cours à l'école cette semaine-là, false s'ils sont en entreprise
   */
  static isLessonWeek(date: Date, startDate: Date, rhythm: RhythmType): boolean {
    // Si le rythme est hebdomadaire, il y a cours toutes les semaines.
    if (rhythm === RhythmType.WEEKLY) return true;

    // Rythme alternance 1/4 (1 semaine école / 4 semaines entreprise)
    if (rhythm === RhythmType.ALTERNANCE_1_4) {
      const start = startOfWeek(startDate, { weekStartsOn: 1 });
      const current = startOfWeek(date, { weekStartsOn: 1 });
      
      // Calcule le nombre exact de semaines d'écart depuis la date de référence
      const diffInWeeks = Math.round(
        (current.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)
      );

      // Rythme 1/4 : La semaine de cours est programmée toutes les 4 semaines (semaine 0, 4, 8...)
      return diffInWeeks % 4 === 0;
    }

    // Par défaut, s'il s'agit d'un rythme non géré, renvoie faux.
    return false;
  }
}