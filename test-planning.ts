import { RhythmType } from '@prisma/client';

// On simule la logique du service ici pour tester vite
function isLessonWeek(date: Date, startDate: Date, rhythm: RhythmType): boolean {
  if (rhythm === RhythmType.WEEKLY) return true;

  if (rhythm === RhythmType.ALTERNANCE_1_3) {
    // On normalise au début de semaine (Lundi) pour comparer des blocs de 7 jours
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const day = start.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const firstMonday = new Date(start.setDate(start.getDate() + diffToMonday));

    const current = new Date(date);
    current.setHours(0, 0, 0, 0);
    const currentDay = current.getDay();
    const currentDiffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const currentMonday = new Date(current.setDate(current.getDate() + currentDiffToMonday));
    
    const diffInMs = currentMonday.getTime() - firstMonday.getTime();
    const diffInWeeks = Math.round(diffInMs / (7 * 24 * 60 * 60 * 1000));

    return diffInWeeks % 4 === 0;
  }
  return false;
}

// --- SCÉNARIO DE TEST ---
const dateDebutSemestre = new Date("2026-01-05"); // Lundi 5 Janvier 2026
const typeAlternance = RhythmType.ALTERNANCE_1_3;

console.log(`--- TEST PLANNING SKILLA (Rythme: ${typeAlternance}) ---`);
console.log(`Début du semestre : ${dateDebutSemestre.toLocaleDateString()}\n`);

for (let i = 0; i < 12; i++) {
  const dateAComparer = new Date(dateDebutSemestre);
  dateAComparer.setDate(dateDebutSemestre.getDate() + (i * 7));
  
  const cours = isLessonWeek(dateAComparer, dateDebutSemestre, typeAlternance);
  const label = cours ? "📚 [COURS] CFA" : "🏢 [ENTREPRISE]";
  
  console.log(`Semaine ${i + 1} (${dateAComparer.toLocaleDateString()}) : ${label}`);
}