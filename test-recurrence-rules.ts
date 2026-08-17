import { isSameDay, parseISO, format } from 'date-fns';

// Simuler la logique de génération des récurrences de advanced-planning-client.tsx
function simulateRecurrenceGeneration(
  start: Date,
  end: Date,
  occurrences: number,
  periodicity: string,
  holidays: Array<{ date: string | Date }>
) {
  const intervalWeeks = periodicity === "weekly" ? 1 : (periodicity === "1/4" ? 4 : 1);
  const creations = [];
  let weeksAdded = 0;
  let createdCount = 0;

  while (createdCount < occurrences) {
    const nextStart = new Date(start);
    nextStart.setDate(start.getDate() + (weeksAdded * intervalWeeks * 7));
    const nextEnd = new Date(end);
    nextEnd.setDate(end.getDate() + (weeksAdded * intervalWeeks * 7));

    if (occurrences > 1) {
      const isHoliday = holidays.some(h => {
        const hDate = typeof h.date === 'string' ? parseISO(h.date) : new Date(h.date);
        return isSameDay(hDate, nextStart);
      });
      if (isHoliday) {
        weeksAdded++;
        continue;
      }
    }

    creations.push({
      startTime: nextStart,
      endTime: nextEnd
    });

    createdCount++;
    weeksAdded++;
  }

  return creations;
}

// Suite de tests
function runTests() {
  console.log("=== RUNNING PLANNING RECURRENCE TESTS ===\n");

  const baseDate = new Date("2026-09-07T09:00:00.000Z"); // Un lundi
  const endDate = new Date("2026-09-07T11:00:00.000Z");

  // Test 1 : Hebdomadaire standard (sans jour férié)
  console.log("Test 1: Hebdomadaire standard (5 occurrences)");
  const res1 = simulateRecurrenceGeneration(baseDate, endDate, 5, "weekly", []);
  console.log(`  - Occurrences générées : ${res1.length} (Attendu : 5)`);
  res1.forEach((c, idx) => {
    console.log(`    Occ ${idx + 1} : ${format(c.startTime, 'dd/MM/yyyy')}`);
  });
  if (res1.length !== 5) throw new Error("Test 1 échoué");

  // Test 2 : Rythme 1/4 (3 occurrences)
  console.log("\nTest 2: Rythme 1/4 (3 occurrences)");
  const res3 = simulateRecurrenceGeneration(baseDate, endDate, 3, "1/4", []);
  console.log(`  - Occurrences générées : ${res3.length} (Attendu : 3)`);
  res3.forEach((c, idx) => {
    console.log(`    Occ ${idx + 1} : ${format(c.startTime, 'dd/MM/yyyy')}`);
  });
  if (res3.length !== 3 || format(res3[1].startTime, 'dd/MM/yyyy') !== "05/10/2026") {
    throw new Error("Test 2 échoué");
  }

  // Test 3 : Hebdomadaire avec saut de jours fériés
  console.log("\nTest 3: Hebdomadaire avec jour férié le lundi 14 Septembre (Semaine 2)");
  const holidays = [
    { date: "2026-09-14T00:00:00.000Z" } // Semaine 2
  ];
  const res4 = simulateRecurrenceGeneration(baseDate, endDate, 4, "weekly", holidays);
  console.log(`  - Occurrences générées : ${res4.length} (Attendu : 4)`);
  res4.forEach((c, idx) => {
    console.log(`    Occ ${idx + 1} : ${format(c.startTime, 'dd/MM/yyyy')}`);
  });
  // Devrait être : 07/09, 21/09, 28/09, 05/10 (le 14/09 est sauté)
  if (res4.length !== 4) throw new Error("Test 3 échoué : Nombre d'occurrences incorrect");
  if (format(res4[1].startTime, 'dd/MM/yyyy') !== "21/09/2026") {
    throw new Error("Test 3 échoué : Le jour férié n'a pas été sauté ou décalé correctement");
  }

  console.log("\n>>> TOUS LES TESTS SONT AU VERT ! <<<");
}

runTests();
