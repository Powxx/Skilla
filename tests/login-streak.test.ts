import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { computeLoginStreak } from "@/lib/login-streak";

const now = new Date(2026, 10, 3, 10, 0);

describe("computeLoginStreak", () => {
  it("démarre à 1 pour une première connexion", () => {
    expect(computeLoginStreak(null, 0, now)).toBe(1);
  });

  it("incrémente si la dernière connexion date d'hier", () => {
    expect(computeLoginStreak(new Date(2026, 10, 2, 23, 59), 4, now)).toBe(5);
  });

  it("ne change pas si déjà connecté aujourd'hui", () => {
    expect(computeLoginStreak(new Date(2026, 10, 3, 8, 0), 4, now)).toBe(4);
  });

  it("repart à 1 après un jour manqué", () => {
    expect(computeLoginStreak(new Date(2026, 10, 1, 12, 0), 9, now)).toBe(1);
  });
});
