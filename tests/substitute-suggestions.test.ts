import { describe, expect, it } from "vitest";
import { evaluateSubstitute } from "@/lib/substitute-suggestions";

// Mardi 3 novembre 2026, 09:00 - 11:00
const lessonStart = new Date(2026, 10, 3, 9, 0);
const lessonEnd = new Date(2026, 10, 3, 11, 0);

describe("evaluateSubstitute", () => {
  it("est libre sans cours ni disponibilités déclarées", () => {
    expect(
      evaluateSubstitute({ lessonStart, lessonEnd, availabilities: [], busyLessons: [] }),
    ).toBe("FREE");
  });

  it("est occupé si un cours chevauche le créneau", () => {
    expect(
      evaluateSubstitute({
        lessonStart,
        lessonEnd,
        availabilities: [],
        busyLessons: [{ startTime: new Date(2026, 10, 3, 10, 0), endTime: new Date(2026, 10, 3, 12, 0) }],
      }),
    ).toBe("BUSY");
  });

  it("n'est pas occupé si le cours précédent se termine pile au début", () => {
    expect(
      evaluateSubstitute({
        lessonStart,
        lessonEnd,
        availabilities: [],
        busyLessons: [{ startTime: new Date(2026, 10, 3, 7, 0), endTime: new Date(2026, 10, 3, 9, 0) }],
      }),
    ).toBe("FREE");
  });

  it("est indisponible si les disponibilités déclarées ne couvrent pas le créneau", () => {
    expect(
      evaluateSubstitute({
        lessonStart,
        lessonEnd,
        availabilities: [{ dayOfWeek: 3, startTime: "08:00", endTime: "18:00" }],
        busyLessons: [],
      }),
    ).toBe("UNAVAILABLE");
  });

  it("est libre si une disponibilité couvre le créneau", () => {
    expect(
      evaluateSubstitute({
        lessonStart,
        lessonEnd,
        availabilities: [{ dayOfWeek: 2, startTime: "08:00", endTime: "12:00" }],
        busyLessons: [],
      }),
    ).toBe("FREE");
  });
});
