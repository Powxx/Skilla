import { describe, expect, it } from "vitest";
import { computeAlternanceWeeks, groupAlternancePeriods } from "@/lib/alternance";

const lesson = (y: number, m: number, d: number) => ({
  startTime: new Date(y, m, d, 9, 0),
  endTime: new Date(y, m, d, 12, 0),
});

describe("computeAlternanceWeeks", () => {
  // Contrat du lundi 5 oct. 2026 au dimanche 1er nov. 2026 (4 semaines)
  const contractStart = new Date(2026, 9, 5);
  const contractEnd = new Date(2026, 10, 1);

  it("détecte école / entreprise selon les cours de la semaine", () => {
    const weeks = computeAlternanceWeeks({
      lessons: [lesson(2026, 9, 6), lesson(2026, 9, 7), lesson(2026, 9, 27)],
      holidays: [],
      contractStart,
      contractEnd,
    });
    expect(weeks.map((w) => w.status)).toEqual(["SCHOOL", "COMPANY", "COMPANY", "SCHOOL"]);
    expect(weeks[0].lessonCount).toBe(2);
    expect(weeks[0].hours).toBe(6);
  });

  it("marque les semaines de vacances (lun-ven fermés) sans cours", () => {
    const holidays = [19, 20, 21, 22, 23].map((d) => new Date(2026, 9, d));
    const weeks = computeAlternanceWeeks({
      lessons: [lesson(2026, 9, 6), lesson(2026, 9, 27)],
      holidays,
      contractStart,
      contractEnd,
    });
    expect(weeks[2].status).toBe("HOLIDAY");
    expect(weeks[1].status).toBe("COMPANY");
  });

  it("ne déclare pas « entreprise » une semaine après le dernier cours planifié", () => {
    const weeks = computeAlternanceWeeks({
      lessons: [lesson(2026, 9, 6)],
      holidays: [],
      contractStart,
      contractEnd,
    });
    expect(weeks.map((w) => w.status)).toEqual(["SCHOOL", "UNKNOWN", "UNKNOWN", "UNKNOWN"]);
  });

  it("signale les semaines hors période de contrat", () => {
    const weeks = computeAlternanceWeeks({
      lessons: [lesson(2026, 9, 6)],
      holidays: [],
      contractStart: new Date(2026, 9, 7),
      contractEnd,
    });
    expect(weeks[0].inContract).toBe(true);
    expect(weeks).toHaveLength(4);
  });
});

describe("groupAlternancePeriods", () => {
  it("fusionne les semaines consécutives de même statut", () => {
    const weeks = computeAlternanceWeeks({
      lessons: [lesson(2026, 9, 6), lesson(2026, 9, 13), lesson(2026, 9, 27)],
      holidays: [],
      contractStart: new Date(2026, 9, 5),
      contractEnd: new Date(2026, 10, 1),
    });
    const periods = groupAlternancePeriods(weeks);
    expect(periods.map((p) => [p.status, p.weeks])).toEqual([
      ["SCHOOL", 2],
      ["COMPANY", 1],
      ["SCHOOL", 1],
    ]);
  });
});
