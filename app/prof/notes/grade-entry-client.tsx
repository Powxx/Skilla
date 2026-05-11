"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { saveGradesBatch } from "@/app/actions/notes";
import { getStudentsByClass, type StudentForGradeEntry } from "./actions";

type ClassOption = { id: string; name: string };
type SubjectOption = { id: string; name: string };

type Props = {
  classes: ClassOption[];
  subjects: SubjectOption[];
};

type UiResult =
  | { error: string }
  | { savedCount: number }
  | null;

function parseNote(raw: string): number | null {
  const n = Number(raw.replace(",", ".").trim());
  if (!Number.isFinite(n)) return null;
  return n;
}

export default function GradeEntryClient({ classes, subjects }: Props) {
  const [subjectId, setSubjectId] = useState("");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [students, setStudents] = useState<StudentForGradeEntry[]>([]);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [coefficient, setCoefficient] = useState("1");
  const [comment, setComment] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [result, setResult] = useState<UiResult>(null);
  const [isPendingStudents, startLoadStudents] = useTransition();
  const [isPendingSave, startSave] = useTransition();

  const selectedSubject = useMemo(
    () => subjects.find((x) => x.id === subjectId),
    [subjects, subjectId],
  );
  const selectedClass = useMemo(
    () => classes.find((c) => c.id === classId),
    [classes, classId],
  );
  const selectedStudent = useMemo(
    () => students.find((s) => s.id === studentId),
    [students, studentId],
  );

  useEffect(() => {
    setStudentId("");
    setResult(null);
    if (!classId) {
      setStudents([]);
      setLoadError(null);
      return;
    }

    startLoadStudents(() => {
      setLoadError(null);
      void (async () => {
        try {
          const rows = await getStudentsByClass(classId);
          setStudents(rows);
        } catch {
          setLoadError("Impossible de charger les élèves de cette classe.");
          setStudents([]);
        }
      })();
    });
  }, [classId]);

  const allSelected = Boolean(subjectId && classId && studentId);
  const canEnterGrades = allSelected && !loadError;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResult(null);

    if (!subjectId || !classId || !studentId) {
      setResult({
        error:
          "Sélectionnez une matière, une classe et un élève avant d’enregistrer.",
      });
      return;
    }

    const parsed = parseNote(note);
    if (parsed === null) {
      setResult({ error: "Saisissez une note numérique valide." });
      return;
    }
    if (parsed < 0 || parsed > 20) {
      setResult({ error: "La note doit être comprise entre 0 et 20 (inclus)." });
      return;
    }

    const coefRaw = coefficient.trim().replace(",", ".");
    const coefNum = coefRaw === "" ? 1 : Number(coefRaw);
    if (!Number.isFinite(coefNum) || coefNum <= 0) {
      setResult({ error: "Le coefficient doit être un nombre strictement positif." });
      return;
    }

    startSave(() => {
      void saveGradesBatch([
        {
          studentId,
          note: parsed,
          matiereId: subjectId,
          coefficient: coefNum,
          date: new Date(date),
          comment: comment.trim() === "" ? null : comment.trim(),
        },
      ]).then((res) => {
        if (res.ok) {
          setResult({ savedCount: res.count });
          setNote("");
          setCoefficient("1");
          setComment("");
        } else {
          setResult({ error: res.error });
        }
      });
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Saisie des notes
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          En haut de page, choisissez la <strong className="font-medium text-slate-800">matière</strong>, la{" "}
          <strong className="font-medium text-slate-800">classe</strong> puis{" "}
          <strong className="font-medium text-slate-800">l’élève</strong>. La saisie n’apparaît qu’une fois ces trois choix faits. L’enregistrement utilise la Server Action{" "}
          <code className="rounded-md bg-white px-1.5 py-0.5 text-xs font-medium text-slate-800 ring-1 ring-slate-200">
            saveGradesBatch
          </code>{" "}
          avec l’<strong className="font-medium text-slate-800">identifiant de la matière</strong> pour chaque note.
        </p>
      </header>

      {classes.length === 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Aucune classe en base. Ajoutez des classes (ou seed) avant de saisir des
          notes.
        </p>
      ) : null}

      {subjects.length === 0 ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Aucune matière en base. Créez des entrées{" "}
          <code className="rounded bg-white px-1 ring-1 ring-amber-200/80">
            Subject
          </code>{" "}
          pour les lister ici.
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-8" noValidate>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04] sm:p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Sélection
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">
                Matière
              </span>
              <select
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setResult(null);
                }}
                disabled={subjects.length === 0}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Choisir une matière…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">
                Classe
              </span>
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setResult(null);
                }}
                disabled={classes.length === 0}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Choisir une classe…</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">
                Élève
              </span>
              <select
                value={studentId}
                onChange={(e) => {
                  setStudentId(e.target.value);
                  setResult(null);
                }}
                disabled={
                  !classId ||
                  isPendingStudents ||
                  students.length === 0 ||
                  Boolean(loadError)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {!classId
                    ? "Choisissez d’abord une classe…"
                    : isPendingStudents
                      ? "Chargement…"
                      : students.length === 0
                        ? "Aucun élève dans cette classe"
                        : "Choisir un élève…"}
                </option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.user.lastName} {s.user.firstName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedSubject && selectedClass && selectedStudent ? (
            <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200/80">
              <span className="font-medium text-slate-800">Résumé :</span>{" "}
              {selectedSubject.name}
              {" · "}
              {selectedClass.name}
              {" · "}
              {selectedStudent.user.lastName} {selectedStudent.user.firstName}
            </p>
          ) : null}
        </div>

        {loadError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {loadError}
          </p>
        ) : null}

       {result && 'error' in result ? (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {result.error}
          </p>
        ) : null}

        {result && "savedCount" in result && result.savedCount > 0 ? (
          <p
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            role="status"
          >
            {result.savedCount} note(s) enregistrée(s).
          </p>
        ) : null}

        {canEnterGrades ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.04] sm:p-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
              Note
            </p>
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
              <label className="block sm:col-span-1">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">
                  Note (/20)
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ex. 14,5"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm tabular-nums outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/25"
                />
              </label>
              <label className="block sm:col-span-1">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">
                  Date de la note
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm tabular-nums outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/25"
                />
              </label>
              <label className="block sm:col-span-1">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">
                  Coefficient
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={coefficient}
                  onChange={(e) => setCoefficient(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm tabular-nums outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/25"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">
                  Commentaire (optionnel)
                </span>
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Remarque pour le bulletin…"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/25"
                />
              </label>
            </div>
          </div>
        ) : (
          !loadError &&
          (subjectId || classId) && (
            <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 ring-1 ring-slate-900/[0.04]">
              Complétez la sélection (matière, classe et élève) pour afficher la zone
              de saisie.
            </p>
          )
        )}

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={
              !canEnterGrades ||
              isPendingSave ||
              subjects.length === 0 ||
              classes.length === 0
            }
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPendingSave ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
