import { format } from "date-fns";

export type SubstituteAvailabilityStatus = "FREE" | "BUSY" | "UNAVAILABLE";

type Slot = { dayOfWeek: number; startTime: string; endTime: string };

/**
 * Évalue si un enseignant peut prendre un créneau.
 * - BUSY : il a déjà un cours qui chevauche le créneau ;
 * - UNAVAILABLE : il a déclaré des disponibilités et aucune ne couvre le créneau ;
 * - FREE : sinon (y compris s'il n'a déclaré aucune disponibilité).
 */
export function evaluateSubstitute(params: {
  lessonStart: Date;
  lessonEnd: Date;
  availabilities: Slot[];
  busyLessons: { startTime: Date; endTime: Date }[];
}): SubstituteAvailabilityStatus {
  const { lessonStart, lessonEnd, availabilities, busyLessons } = params;

  const overlaps = busyLessons.some(
    (l) => l.startTime < lessonEnd && l.endTime > lessonStart,
  );
  if (overlaps) return "BUSY";

  if (availabilities.length > 0) {
    const day = lessonStart.getDay();
    const start = format(lessonStart, "HH:mm");
    const end = format(lessonEnd, "HH:mm");
    const covered = availabilities.some(
      (a) => a.dayOfWeek === day && a.startTime <= start && a.endTime >= end,
    );
    if (!covered) return "UNAVAILABLE";
  }

  return "FREE";
}
