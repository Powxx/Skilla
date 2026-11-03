import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  lesson: { findFirst: vi.fn() },
  user: { findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ default: prismaMock, prisma: prismaMock }));
vi.mock("@/lib/teacher-utils", () => ({
  getEffectiveTeacherId: vi.fn(async (id: string) => id),
}));

import { canAccessClass, canAccessLesson, canAccessStudents } from "@/lib/teacher-access";

const teacher = { id: "t1", role: "TEACHER" };
const admin = { id: "a1", role: "ADMIN" };
const student = { id: "s1", role: "STUDENT" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("canAccessClass", () => {
  it("autorise toujours un admin sans requête", async () => {
    expect(await canAccessClass(admin, "c1")).toBe(true);
    expect(prismaMock.lesson.findFirst).not.toHaveBeenCalled();
  });

  it("refuse un élève", async () => {
    expect(await canAccessClass(student, "c1")).toBe(false);
  });

  it("autorise un prof qui a un cours dans la classe", async () => {
    prismaMock.lesson.findFirst.mockResolvedValue({ id: "l1" });
    expect(await canAccessClass(teacher, "c1")).toBe(true);
    expect(prismaMock.lesson.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { classId: "c1", OR: [{ teacherId: "t1" }, { substituteId: "t1" }] },
      })
    );
  });

  it("refuse un prof sans cours dans la classe", async () => {
    prismaMock.lesson.findFirst.mockResolvedValue(null);
    expect(await canAccessClass(teacher, "c2")).toBe(false);
  });
});

describe("canAccessStudents", () => {
  it("refuse si un élève est inconnu", async () => {
    prismaMock.user.findMany.mockResolvedValue([{ classId: "c1" }]);
    expect(await canAccessStudents(teacher, ["s1", "s2"])).toBe(false);
  });

  it("refuse si un élève n'a pas de classe", async () => {
    prismaMock.user.findMany.mockResolvedValue([{ classId: null }]);
    expect(await canAccessStudents(teacher, ["s1"])).toBe(false);
  });

  it("refuse si une des classes n'est pas enseignée par le prof", async () => {
    prismaMock.user.findMany.mockResolvedValue([{ classId: "c1" }, { classId: "c2" }]);
    prismaMock.lesson.findFirst.mockImplementation(async ({ where }: { where: { classId: string } }) =>
      where.classId === "c1" ? { id: "l1" } : null
    );
    expect(await canAccessStudents(teacher, ["s1", "s2"])).toBe(false);
  });

  it("autorise si toutes les classes sont enseignées par le prof", async () => {
    prismaMock.user.findMany.mockResolvedValue([{ classId: "c1" }, { classId: "c1" }]);
    prismaMock.lesson.findFirst.mockResolvedValue({ id: "l1" });
    expect(await canAccessStudents(teacher, ["s1", "s2"])).toBe(true);
  });
});

describe("canAccessLesson", () => {
  it("autorise le titulaire et le remplaçant, refuse les autres", async () => {
    expect(await canAccessLesson(teacher, { teacherId: "t1", substituteId: null })).toBe(true);
    expect(await canAccessLesson(teacher, { teacherId: "t2", substituteId: "t1" })).toBe(true);
    expect(await canAccessLesson(teacher, { teacherId: "t2", substituteId: null })).toBe(false);
  });
});
