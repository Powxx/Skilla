"use client";

import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type DashboardChartRow = {
  /** Libellé court pour l'axe X (ex. jj/mm). */
  dateLabel: string;
  note: number;
  coefficient: number;
  subjectName: string;
  isoDate: string;
};

export type DashboardClientProps = {
  studentDisplayName: string;
  studentEmail: string;
  classLabel: string;
  generalAverage: number | null;
  chartRows: DashboardChartRow[];
  absenceCount: number;
  delayCount: number;
  /** Lien « Voir le détail » assiduité (élève ou parent avec `studentId`). */
  absencesDetailHref: string;
};

function formatAvg(n: number) {
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const MOCK_RANK_LABEL = "3ᵉ";

export default function StudentDashboardClient({
  studentDisplayName,
  studentEmail,
  classLabel,
  generalAverage,
  chartRows,
  absenceCount,
  delayCount,
  absencesDetailHref,
}: DashboardClientProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 font-sans text-slate-900 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Tableau de bord
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-semibold text-slate-800">{studentDisplayName}</span>
          {" · "}
          <span className="text-slate-500">{studentEmail}</span>
          {" · "}
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/80">
            {classLabel}
          </span>
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Moyenne générale
          </p>
          <p className="mt-1 text-[11px] text-slate-400">pondérée (coef.)</p>
          <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
            {generalAverage != null ? (
              <>
                {formatAvg(generalAverage)}
                <span className="text-lg font-normal text-slate-400"> / 20</span>
              </>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Assiduité
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Compteurs depuis la base (absences · retards)
          </p>
          <div className="mt-4 flex gap-8">
            <div>
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
                {absenceCount}
              </p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-red-900/70">
                Absences
              </p>
            </div>
            <div>
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
                {delayCount}
              </p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-orange-900/75">
                Retards
              </p>
            </div>
          </div>
          <Link
            href={absencesDetailHref}
            className="mt-4 inline-flex text-xs font-semibold text-sky-800 underline underline-offset-2 hover:text-sky-950"
          >
            Voir le détail et le statut de justification →
          </Link>
        </article>

        <article className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Rang en classe
          </p>
          <p className="mt-1 text-[11px] text-slate-400">indicatif (factice)</p>
          <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
            {MOCK_RANK_LABEL}
            <span className="text-lg font-normal text-slate-400"> / 24</span>
          </p>
        </article>
      </div>

      <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04] sm:p-8">
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Évolution des notes
            </h2>
            <p className="text-sm text-slate-500">
              Notes dans l’ordre chronologique (échelle /20).
            </p>
          </div>
        </div>

        {chartRows.length === 0 ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 text-sm text-slate-500">
            Aucune note à afficher pour le moment.
          </div>
        ) : (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartRows}
                margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  domain={[0, 20]}
                  width={36}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                    fontSize: "13px",
                  }}
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload as DashboardChartRow | undefined;
                    return p
                      ? new Date(p.isoDate).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "";
                  }}
                  formatter={(value, _name, item) => {
                    const row = item?.payload as DashboardChartRow;
                    const v = typeof value === "number" ? value : Number(value);
                    return [
                      `${v.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} / 20 — ${row?.subjectName ?? ""} (coef. ${row?.coefficient ?? 1})`,
                      "Note",
                    ];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="note"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    fill: "#0d9488",
                    stroke: "#fff",
                    strokeWidth: 2,
                  }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
