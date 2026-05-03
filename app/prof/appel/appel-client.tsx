"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { getStudentsByClass } from "@/app/prof/notes/actions"; // Vérifie que le chemin pointe vers actions_2.ts
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
  const params = useParams();
  // On récupère l'ID de la leçon depuis l'URL
  const lessonId = params.id as string; 

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
    if (!classId || !lessonId) return;

    runSave(() => {
      // On passe lessonId car il est maintenant requis par l'action[cite: 1]
      void submitRollCall({ classId, lessonId, markings: states }).then((res) => {
        if (res.ok) {
          setFeedback({
            type: "success",
            text: res.created === 0
                ? "Appel validé — tous présents."
                : `${res.created} absence(s)/retard(s) enregistré(s).`,
          });
          // Optionnel : réinitialiser les états après succès
        } else {
          setFeedback({ type: "error", text: res.error });
        }
      });
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 max-w-md">
        <label className="text-xs font-bold uppercase text-slate-500">Classe</label>
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-200 p-2.5 text-sm"
        >
          <option value="">Sélectionnez une classe...</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {feedback && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${feedback.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
          {feedback.text}
        </div>
      )}

      {students.length > 0 && (
        <div className="rounded-xl border bg-white shadow-sm">
          <ul className="divide-y">
            {students.map((s) => {
              const st = states[s.id] || "present";
              return (
                <li key={s.id} className="flex items-center justify-between p-4">
                  <div>
                    {/* Correction ici : s.user.lastName au lieu de s.lastName[cite: 3] */}
                    <p className="font-bold">{s.user.lastName} {s.user.firstName}</p>
                    <span className="text-xs uppercase text-slate-400">{st}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPresence(s.id, "absent")}
                      className={`px-3 py-1 rounded text-xs font-bold ${st === "absent" ? "bg-red-600 text-white" : "bg-red-50 text-red-700"}`}
                    >
                      Absent
                    </button>
                    <button
                      onClick={() => setPresence(s.id, "late")}
                      className={`px-3 py-1 rounded text-xs font-bold ${st === "late" ? "bg-orange-500 text-white" : "bg-orange-50 text-orange-700"}`}
                    >
                      Retard
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="p-4 bg-slate-50">
            <button
              onClick={handleValidate}
              disabled={pendingSave}
              className="w-full sm:w-auto px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold disabled:opacity-50"
            >
              {pendingSave ? "Enregistrement..." : "Valider l'appel"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}