"use client";

import { useEffect, useState, useTransition } from "react";
import { getStudentsByClass } from "@/app/prof/notes/actions";
import type { StudentForGradeEntry } from "@/app/prof/notes/actions";
import { submitRollCall } from "./actions";

type ClassOption = { id: string; name: string };

type Props = {
  classes: ClassOption[];
};

export type PresenceState = "present" | "absent" | "late";

function initStates(ids: string[]): Record<string, PresenceState> {
  const o: Record<string, PresenceState> = {};
  for (const id of ids) o[id] = "present";
  return o;
}

export default function AppelClient({ classes }: Props) {
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<StudentForGradeEntry[]>([]);
  const [states, setStates] = useState<Record<string, PresenceState>>({});
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [pendingStudents, loadStudents] = useTransition();
  const [pendingSave, runSave] = useTransition();

  useEffect(() => {
    setFeedback(null);
    if (!classId) {
      setStudents([]);
      setStates({});
      setLoadErr(null);
      return;
    }

    loadStudents(() => {
      setLoadErr(null);
      void (async () => {
        try {
          const rows = await getStudentsByClass(classId);
          setStudents(rows);
          setStates(initStates(rows.map((r) => r.id)));
        } catch {
          setLoadErr("Impossible de charger les élèves.");
          setStudents([]);
          setStates({});
        }
      })();
    });
  }, [classId]);

  const setPresence = (studentId: string, next: Exclude<PresenceState, "present">) => {
    setStates((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === next ? "present" : next,
    }));
    setFeedback(null);
  };

  const handleValidate = () => {
    setFeedback(null);
    if (!classId) return;
    runSave(() => {
      void submitRollCall({ classId, markings: states }).then((res) => {
        if (res.ok) {
          setFeedback({
            type: "success",
            text:
              res.created === 0
                ? "Appel validé — tous les élèves étaient présents (aucune entrée créée)."
                : `${res.created} entrée(s) enregistrée(s) dans l’historique d’assiduité.`,
          });
          setStates(initStates(students.map((s) => s.id)));
        } else {
          setFeedback({ type: "error", text: res.error });
        }
      });
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 font-sans sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Appel
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Par défaut, tous les élèves sont <strong className="text-slate-800">présents</strong>.
          Seuls absence et retard donnent lieu à une entrée{" "}
          <code className="rounded bg-white px-1 text-xs ring-1 ring-slate-200">
            Attendance
          </code>{" "}
          à la validation.
        </p>
      </header>

      <div className="mb-6 max-w-md">
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Classe
        </label>
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-slate-400/30 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/15"
        >
          <option value="">Choisissez une classe…</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loadErr ? (
        <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadErr}
        </p>
      ) : null}

      {feedback ? (
        <p
          className={`mb-6 rounded-xl border px-4 py-3 text-sm ${feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-800"
            }`}
          role={feedback.type === "error" ? "alert" : "status"}
        >
          {feedback.text}
        </p>
      ) : null}

      {pendingStudents ? (
        <p className="text-sm text-slate-500">Chargement de la liste…</p>
      ) : null}

      {classId && !pendingStudents && students.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-900/[0.04]">
          Aucun élève dans cette classe.
        </p>
      ) : null}

      {students.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
          <ul className="divide-y divide-slate-100">
            {students.map((s) => {
              const st = states[s.id] ?? "present";
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:flex-nowrap sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {s.user.lastName}{" "}
                      <span className="font-normal text-slate-600">
                        {s.user.firstName}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {st === "present" && (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-900 ring-1 ring-emerald-200/80">
                          Présent
                        </span>
                      )}
                      {st === "absent" && (
                        <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-900 ring-1 ring-red-200/80">
                          Absent
                        </span>
                      )}
                      {st === "late" && (
                        <span className="inline-flex rounded-full bg-orange-50 px-2 py-0.5 font-medium text-orange-950 ring-1 ring-orange-200/80">
                          En retard
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      aria-pressed={st === "absent"}
                      onClick={() => setPresence(s.id, "absent")}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${st === "absent"
                        ? "bg-red-600 text-white shadow-sm ring-2 ring-red-700/30"
                        : "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100"}`}
                    >
                      Absent
                    </button>
                    <button
                      type="button"
                      aria-pressed={st === "late"}
                      onClick={() => setPresence(s.id, "late")}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 ${st === "late"
                        ? "bg-orange-500 text-white shadow-sm ring-2 ring-orange-600/35"
                        : "border border-orange-200 bg-orange-50 text-orange-950 hover:bg-orange-100"}`}
                    >
                      En retard
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-slate-100 bg-slate-50/90 px-5 py-4">
            <button
              type="button"
              onClick={handleValidate}
              disabled={pendingSave || !classId}
              className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-50 sm:w-auto sm:min-w-[12rem]"
            >
              {pendingSave ? "Enregistrement…" : "Valider l’appel"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
