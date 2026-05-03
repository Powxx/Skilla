import prisma from "@/lib/prisma";
import type { DashboardChartRow } from "@/app/student/dashboard/dashboard-client";
import type { DashboardClientProps } from "@/app/student/dashboard/dashboard-client";

export type DashboardBuildPayload = Omit<
  DashboardClientProps,
  "absencesDetailHref"
>;

type GradeLite = { value: number; coefficient: number };

function weightedAverage(grades: GradeLite[]): number | null {
  if (grades.length === 0) return null;
  let sumWx = 0;
  let sumC = 0;
  for (const g of grades) {
    const c =
      Number.isFinite(g.coefficient) && g.coefficient > 0 ? g.coefficient : 1;
    sumWx += g.value * c;
    sumC += c;
  }
  if (sumC <= 0) return null;
  return sumWx / sumC;
}

export async function loadStudentDashboardPayload(
  where: { id: string },
): Promise<DashboardBuildPayload | null> {
  const student = await prisma.user.findUnique({
    where,
    include: {
      class: true,
      grades: {
        orderBy: { createdAt: "asc" },
      },
      absences: true,
    },
  });

  if (!student) return null;

  const absenceCount = student.absences.filter(
    (a) => a.status === "ABSENT" || a.status === "EXCUSED",
  ).length;
  const delayCount = student.absences.filter(
    (a) => a.status === "LATE",
  ).length;

  const grades = student.grades;
  const generalAverage = weightedAverage(grades.map((g) => g));

  const chartRows: DashboardChartRow[] = grades.map((g) => {
    const d = g.createdAt;
    return {
      isoDate: d.toISOString(),
      dateLabel: d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      }),
      note: g.value,
      coefficient: g.coefficient,
      subjectName: g.subjectName ?? "Inconnue",
    };
  });

  const dayCounts = new Map<string, number>();
  for (const row of chartRows) {
    const key = row.dateLabel;
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  }
  const seen = new Map<string, number>();
  const chartRowsUniqueX = chartRows.map((row) => {
    const key = row.dateLabel;
    const n = dayCounts.get(key) ?? 1;
    if (n <= 1) return row;
    const i = (seen.get(key) ?? 0) + 1;
    seen.set(key, i);
    return {
      ...row,
      dateLabel: `${row.dateLabel} (${i})`,
    };
  });

  return {
    studentDisplayName: `${student.lastName} ${student.firstName}`,
    studentEmail: student.email ?? "",
    classLabel: student.class?.name ?? "Non assignée",
    generalAverage,
    chartRows: chartRowsUniqueX,
    absenceCount,
    delayCount,
  };
}
