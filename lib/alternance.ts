import { addDays, addWeeks, format, isAfter, isBefore, startOfDay, startOfWeek } from "date-fns";

/**
 * Calendrier d'alternance : déduit, semaine par semaine, si l'apprenti est à l'école ou en entreprise
 * à partir des cours réellement planifiés pour sa classe.
 *
 * Règles :
 * - semaine « école »     : au moins un cours non annulé dans la semaine ;
 * - semaine « vacances »  : aucun cours et tous les jours ouvrés (lun-ven) sont fériés/fermés ;
 * - semaine « entreprise » : aucun cours, dans la période couverte par le planning ;
 * - semaine « inconnue »  : postérieure au dernier cours planifié (planning pas encore publié),
 *   pour ne pas annoncer à tort une semaine en entreprise.
 */

export type AlternanceWeekStatus = "SCHOOL" | "COMPANY" | "HOLIDAY" | "UNKNOWN";

export type AlternanceWeek = {
  /** Lundi de la semaine, au format yyyy-MM-dd. */
  weekStart: string;
  status: AlternanceWeekStatus;
  lessonCount: number;
  /** Durée cumulée des cours de la semaine, en heures. */
  hours: number;
  /** Vrai si la semaine est (en partie) à l'intérieur de la période du contrat. */
  inContract: boolean;
};

export type AlternanceLesson = { startTime: Date; endTime: Date };

export type AlternancePeriod = {
  status: Exclude<AlternanceWeekStatus, "HOLIDAY">;
  startWeek: string;
  endWeek: string;
  weeks: number;
};

const weekKey = (d: Date) => format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

export function computeAlternanceWeeks(params: {
  lessons: AlternanceLesson[];
  holidays: Date[];
  contractStart: Date;
  contractEnd: Date;
}): AlternanceWeek[] {
  const { lessons, holidays, contractStart, contractEnd } = params;

  const perWeek = new Map<string, { count: number; minutes: number }>();
  let lastLesson: Date | null = null;
  for (const l of lessons) {
    const key = weekKey(l.startTime);
    const cur = perWeek.get(key) ?? { count: 0, minutes: 0 };
    cur.count += 1;
    cur.minutes += Math.max(0, (l.endTime.getTime() - l.startTime.getTime()) / 60000);
    perWeek.set(key, cur);
    if (!lastLesson || isAfter(l.startTime, lastLesson)) lastLesson = l.startTime;
  }

  const holidayDays = new Set(holidays.map(dayKey));
  const lastLessonWeek = lastLesson ? weekKey(lastLesson) : null;

  const weeks: AlternanceWeek[] = [];
  const first = startOfWeek(contractStart, { weekStartsOn: 1 });
  const end = startOfDay(contractEnd);

  for (let monday = first; !isAfter(monday, end); monday = addWeeks(monday, 1)) {
    const key = dayKey(monday);
    const stats = perWeek.get(key);

    const allWeekdaysClosed = [0, 1, 2, 3, 4].every((i) => holidayDays.has(dayKey(addDays(monday, i))));

    let status: AlternanceWeekStatus;
    if (stats && stats.count > 0) status = "SCHOOL";
    else if (allWeekdaysClosed) status = "HOLIDAY";
    else if (!lastLessonWeek || key > lastLessonWeek) status = "UNKNOWN";
    else status = "COMPANY";

    const sunday = addDays(monday, 6);
    weeks.push({
      weekStart: key,
      status,
      lessonCount: stats?.count ?? 0,
      hours: Math.round(((stats?.minutes ?? 0) / 60) * 10) / 10,
      inContract: !isAfter(contractStart, sunday) && !isBefore(contractEnd, monday),
    });
  }

  return weeks;
}

/** Regroupe les semaines consécutives de même statut (les vacances sont rattachées à la période en cours). */
export function groupAlternancePeriods(weeks: AlternanceWeek[]): AlternancePeriod[] {
  const periods: AlternancePeriod[] = [];
  for (const w of weeks) {
    if (w.status === "HOLIDAY") {
      const last = periods[periods.length - 1];
      if (last) last.endWeek = w.weekStart;
      continue;
    }
    const last = periods[periods.length - 1];
    if (last && last.status === w.status) {
      last.endWeek = w.weekStart;
      last.weeks += 1;
    } else {
      periods.push({ status: w.status, startWeek: w.weekStart, endWeek: w.weekStart, weeks: 1 });
    }
  }
  return periods;
}
