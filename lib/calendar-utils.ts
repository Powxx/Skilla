import { startOfWeek, endOfWeek, isWithinInterval, parseISO, setHours, setMinutes } from 'date-fns';

/**
 * Génère des événements de calendrier spéciaux (pauses déjeuner et jours fériés)
 * pour décorer l'arrière-plan du composant d'agenda FullCalendar sur une semaine donnée.
 * 
 * @param date Une date incluse dans la semaine à traiter.
 * @param holidays Liste des jours fériés configurés (contenant des objets { date: Date|string, name: string }).
 * @returns Un tableau d'événements spéciaux formatés pour FullCalendar.
 */
export const getSpecialCalendarEvents = (date: Date, holidays: any[] = []) => {
  // Détermine le lundi de la semaine correspondante
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const special: any[] = [];

  // 1. Ajouter les Pauses Déjeuner automatiques (12h00 - 13h30) du Lundi au Vendredi
  for (let i = 0; i < 5; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    special.push({
      id: `break-${day.getTime()}`,
      title: "PAUSE DÉJEUNER",
      start: setMinutes(setHours(day, 12), 0).toISOString(),
      end: setMinutes(setHours(day, 13), 30).toISOString(),
      display: 'background',            // S'affiche en arrière-plan (non déplaçable)
      backgroundColor: '#f1f5f9',       // Couleur Slate-100 neutre
      extendedProps: { type: 'break' }
    });
  }

  // 2. Ajouter les Jours Fériés et Vacances
  holidays.forEach(holiday => {
    // Parse la date si c'est une chaîne ISO
    const d = typeof holiday.date === 'string' ? parseISO(holiday.date) : new Date(holiday.date);
    
    // Vérifie si le jour férié tombe dans la semaine actuellement affichée
    if (isWithinInterval(d, { start: start, end: endOfWeek(start, { weekStartsOn: 1 }) })) {
      
      // Bloque et colore l'arrière-plan de la journée entière (de 8h à 20h)
      special.push({
        start: setHours(d, 8).toISOString(),
        end: setHours(d, 20).toISOString(),
        display: 'background',
        backgroundColor: '#fee2e2',       // Couleur rouge clair (Red-100) pour indiquer l'indisponibilité
        extendedProps: { type: 'holiday' }
      });
      
      // Crée un événement de texte visible superposé pour afficher le nom du jour férié (ex: "Noël")
      special.push({
        title: holiday.name || "JOUR FÉRIÉ",
        start: setHours(d, 8).toISOString(),
        end: setHours(d, 20).toISOString(),
        editable: false,
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: '#ef4444',             // Texte rouge (Red-500)
        extendedProps: { type: 'holiday-label' }
      });
    }
  });

  return special;
};
