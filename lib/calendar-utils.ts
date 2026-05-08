import { startOfWeek, endOfWeek, isWithinInterval, parseISO, setHours, setMinutes } from 'date-fns';

export const getSpecialCalendarEvents = (date: Date, holidays: any[] = []) => {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const special: any[] = [];

  // Lunch Breaks (12:00 - 13:30) for Mon-Fri
  for (let i = 0; i < 5; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    special.push({
      id: `break-${day.getTime()}`,
      title: "PAUSE DÉJEUNER",
      start: setMinutes(setHours(day, 12), 0).toISOString(),
      end: setMinutes(setHours(day, 13), 30).toISOString(),
      display: 'background',
      backgroundColor: '#f1f5f9', // slate-100 (slightly darker for visibility)
      extendedProps: { type: 'break' }
    });
  }

  // Holidays
  holidays.forEach(holiday => {
    const d = typeof holiday.date === 'string' ? parseISO(holiday.date) : new Date(holiday.date);
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
        title: holiday.name || "JOUR FÉRIÉ",
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
