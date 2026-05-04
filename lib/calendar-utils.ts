import { startOfWeek, endOfWeek, isWithinInterval, parseISO, setHours, setMinutes } from 'date-fns';

export const HOLIDAYS_2026 = [
  "2026-01-01", "2026-04-06", "2026-05-01", "2026-05-08", 
  "2026-05-14", "2026-05-25", "2026-07-14", "2026-08-15", 
  "2026-11-01", "2026-11-11", "2026-12-25"
];

export const getSpecialCalendarEvents = (date: Date) => {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const special: any[] = [];

  // Lunch Breaks (12:00 - 13:30) for Mon-Fri
  for (let i = 0; i < 5; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    special.push({
      title: "PAUSE DÉJEUNER",
      start: setMinutes(setHours(day, 12), 0).toISOString(),
      end: setMinutes(setHours(day, 13), 0).toISOString(),
      display: 'background',
      backgroundColor: '#f8fafc', // slate-50
      extendedProps: { type: 'break' }
    });
  }

  // Holidays
  HOLIDAYS_2026.forEach(hDate => {
    const d = parseISO(hDate);
    if (isWithinInterval(d, { start: start, end: endOfWeek(start, { weekStartsOn: 1 }) })) {
      // Background shading
      special.push({
        start: setHours(d, 8).toISOString(),
        end: setHours(d, 20).toISOString(),
        display: 'background',
        backgroundColor: '#fee2e2', // red-100
        extendedProps: { type: 'holiday' }
      });
      // Visible label
      special.push({
        title: "JOUR FÉRIÉ",
        start: setHours(d, 8).toISOString(),
        end: setHours(d, 20).toISOString(),
        editable: false,
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: '#ef4444', // red-500
        extendedProps: { type: 'holiday-label' }
      });
    }
  });

  return special;
};
