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

  // Test 4 : Fusion des heures de professeurs chevauchantes
  console.log("\nTest 4: Fusion des heures de profs (2 cours de 2h simultanés + 1 cours de 1.5h)");
  const mockEvents = [
    {
      start: "2026-09-07T09:00:00.000Z",
      end: "2026-09-07T11:00:00.000Z",
      extendedProps: { teacher: "M. Dupont", class: "Classe A" }
    },
    {
      start: "2026-09-07T09:00:00.000Z",
      end: "2026-09-07T11:00:00.000Z",
      extendedProps: { teacher: "M. Dupont", class: "Classe B" }
    },
    {
      start: "2026-09-07T14:00:00.000Z",
      end: "2026-09-07T15:30:00.000Z",
      extendedProps: { teacher: "M. Dupont", class: "Classe A" }
    }
  ];

  const testStats: any = { teachers: {}, classes: {} };
  const teacherIntervals: { [key: string]: { start: number; end: number }[] } = {};

  mockEvents.forEach(e => {
    const tName = e.extendedProps.teacher;
    const start = new Date(e.start).getTime();
    const end = new Date(e.end).getTime();
    if (!teacherIntervals[tName]) teacherIntervals[tName] = [];
    teacherIntervals[tName].push({ start, end });

    const cName = e.extendedProps.class;
    if (!testStats.classes[cName]) testStats.classes[cName] = 0;
    testStats.classes[cName] += (end - start) / (1000 * 60 * 60);
  });

  for (const tName in teacherIntervals) {
    const intervals = teacherIntervals[tName];
    intervals.sort((a, b) => a.start - b.start);
    const merged = [intervals[0]];
    for (let i = 1; i < intervals.length; i++) {
      const current = intervals[i];
      const last = merged[merged.length - 1];
      if (current.start < last.end) {
        last.end = Math.max(last.end, current.end);
      } else {
        merged.push(current);
      }
    }
    testStats.teachers[tName] = merged.reduce((acc, curr) => acc + (curr.end - curr.start), 0) / (1000 * 60 * 60);
  }

  console.log(`  - Heures M. Dupont : ${testStats.teachers["M. Dupont"]}h (Attendu : 3.5h)`);
  console.log(`  - Heures Classe A : ${testStats.classes["Classe A"]}h (Attendu : 3.5h)`);
  console.log(`  - Heures Classe B : ${testStats.classes["Classe B"]}h (Attendu : 2h)`);

  if (testStats.teachers["M. Dupont"] !== 3.5) {
    throw new Error("Test 4 échoué : les heures du prof n'ont pas été fusionnées correctement.");
  }
  if (testStats.classes["Classe A"] !== 3.5 || testStats.classes["Classe B"] !== 2) {
    throw new Error("Test 4 échoué : les heures des classes sont incorrectes.");
  }

  // Test 5 : Fusion d'un cours de 2h et un cours de 1h simultané (imbriqué)
  console.log("\nTest 5: Fusion d'un cours de 2h et un cours de 1h simultané");
  const mockEvents2 = [
    {
      start: "2026-09-07T09:00:00.000Z",
      end: "2026-09-07T11:00:00.000Z",
      extendedProps: { teacher: "M. Martin", class: "Classe A" }
    },
    {
      start: "2026-09-07T09:00:00.000Z",
      end: "2026-09-07T10:00:00.000Z",
      extendedProps: { teacher: "M. Martin", class: "Classe B" }
    }
  ];

  const testStats2: any = { teachers: {}, classes: {} };
  const teacherIntervals2: { [key: string]: { start: number; end: number }[] } = {};

  mockEvents2.forEach(e => {
    const tName = e.extendedProps.teacher;
    const start = new Date(e.start).getTime();
    const end = new Date(e.end).getTime();
    if (!teacherIntervals2[tName]) teacherIntervals2[tName] = [];
    teacherIntervals2[tName].push({ start, end });

    const cName = e.extendedProps.class;
    if (!testStats2.classes[cName]) testStats2.classes[cName] = 0;
    testStats2.classes[cName] += (end - start) / (1000 * 60 * 60);
  });

  for (const tName in teacherIntervals2) {
    const intervals = teacherIntervals2[tName];
    intervals.sort((a, b) => a.start - b.start);
    const merged = [intervals[0]];
    for (let i = 1; i < intervals.length; i++) {
      const current = intervals[i];
      const last = merged[merged.length - 1];
      if (current.start < last.end) {
        last.end = Math.max(last.end, current.end);
      } else {
        merged.push(current);
      }
    }
    testStats2.teachers[tName] = merged.reduce((acc, curr) => acc + (curr.end - curr.start), 0) / (1000 * 60 * 60);
  }

  console.log(`  - Heures M. Martin : ${testStats2.teachers["M. Martin"]}h (Attendu : 2h)`);
  if (testStats2.teachers["M. Martin"] !== 2) {
    throw new Error("Test 5 échoué : un cours imbriqué plus court n'a pas été fusionné correctement.");
  }

  // Test 6 : Résolution de conflit par groupId (groupement de cours)
  console.log("\nTest 6: Résolution de conflit par groupId (groupement de cours)");
  
  function mockCheckConflicts(
    start: Date,
    end: Date,
    teacherId: string,
    classId: string,
    roomId: string,
    events: any[],
    groupId?: string | null
  ) {
    for (const event of events) {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      const overlaps = (start < eventEnd && end > eventStart);
      
      if (overlaps) {
        if (groupId && event.extendedProps.groupId === groupId) {
          if (event.extendedProps.classId === classId) {
            return `La classe a déjà cours à cet horaire.`;
          }
          continue;
        }

        if (event.extendedProps.teacherId === teacherId) return `Le professeur est déjà pris à cet horaire.`;
        if (event.extendedProps.classId === classId) return `La classe a déjà cours à cet horaire.`;
        if (roomId && event.extendedProps.roomId === roomId) return `La salle est déjà occupée à cet horaire.`;
      }
    }
    return null;
  }

  const testGroupEvents = [
    {
      start: "2026-09-07T09:00:00.000Z",
      end: "2026-09-07T11:00:00.000Z",
      extendedProps: { teacherId: "prof-1", classId: "class-A", roomId: "room-1", groupId: "group-123" }
    }
  ];

  // Cas A : Même prof, même matière, autre classe, même groupId -> pas de conflit
  const res6A = mockCheckConflicts(
    new Date("2026-09-07T09:00:00.000Z"),
    new Date("2026-09-07T11:00:00.000Z"),
    "prof-1",
    "class-B",
    "room-1",
    testGroupEvents,
    "group-123"
  );
  console.log(`  - Groupement autorisé (même groupId) : ${res6A === null ? "OK" : "ÉCHEC"}`);
  if (res6A !== null) throw new Error("Test 6A échoué");

  // Cas B : Même prof, autre classe, autre/sans groupId -> conflit
  const res6B = mockCheckConflicts(
    new Date("2026-09-07T09:00:00.000Z"),
    new Date("2026-09-07T11:00:00.000Z"),
    "prof-1",
    "class-B",
    "room-1",
    testGroupEvents,
    "group-456"
  );
  console.log(`  - Conflit détecté (groupId différent) : ${res6B !== null ? "OK" : "ÉCHEC"}`);
  if (res6B === null) throw new Error("Test 6B échoué");

  // Cas C : Même classe, même groupId -> conflit
  const res6C = mockCheckConflicts(
    new Date("2026-09-07T09:00:00.000Z"),
    new Date("2026-09-07T11:00:00.000Z"),
    "prof-1",
    "class-A",
    "room-1",
    testGroupEvents,
    "group-123"
  );
  console.log(`  - Conflit de classe détecté (même groupId) : ${res6C !== null ? "OK" : "ÉCHEC"}`);
  if (res6C === null) throw new Error("Test 6C échoué");

  console.log("\n>>> TOUS LES TESTS SONT AU VERT ! <<<");
}

runTests();
