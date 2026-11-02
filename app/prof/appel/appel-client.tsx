import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ShieldAlert } from "lucide-react";
import {
  submitRollCall,
  updateAttendanceStatus,
  getStudentsForRollCall,
  type RollCallStudent,
  type RollCallDispensedStudent,
} from "./actions";

export type PresenceState = "present" | "absent" | "late" | "excused";

function initStates(ids: string[]): Record<string, PresenceState> {
  const o: Record<string, PresenceState> = {};
  for (const id of ids) o[id] = "present";
  return o;
}

export default function AppelClient({ initialLessons }: { initialLessons: any[] }) {
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [students, setStudents] = useState<RollCallStudent[]>([]);
  const [dispensedStudents, setDispensedStudents] = useState<RollCallDispensedStudent[]>([]);
  const [states, setStates] = useState<Record<string, PresenceState>>({});
  const [lateDurations, setLateDurations] = useState<Record<string, number>>({});
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  
  const [pendingStudents, loadStudents] = useTransition();
  const [pendingSave, runSave] = useTransition();

  const handleSelectLesson = (lesson: any) => {
    setSelectedLesson(lesson);
    setFeedback(null);
    setLoadErr(null);
    
    loadStudents(() => {
      void (async () => {
        try {
          const res = await getStudentsForRollCall(lesson.classId, lesson.subjectId || null);
          setStudents(res.students);
          setDispensedStudents(res.dispensedStudents);
          setStates(initStates(res.students.map((r) => r.id)));
          setLateDurations({});
        } catch {
          setLoadErr("Impossible de charger les élèves.");
          setStudents([]);
          setDispensedStudents([]);
          setStates({});
        }
      })();
    });
  };


  const setPresence = (studentId: string, next: PresenceState) => {
    setStates((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === next ? "present" : next,
    }));
    setFeedback(null);
  };

// ... dans le composant AppelClient ...

  const handleValidate = () => {
    if (!selectedLesson) return;
    setFeedback(null);

    runSave(() => {
      void submitRollCall({ 
        classId: selectedLesson.classId, 
        lessonId: selectedLesson.id, 
        markings: states,
        lateDurations
      }).then((res) => {
        if (res.ok) {
          setFeedback({
            type: "success",
            text: res.created === 0
                ? "Appel validé — tous présents."
                : `${res.created} absence(s)/retard(s) enregistré(s).`,
          });
          // Scroll to top to see feedback
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          setFeedback({ type: "error", text: res.error });
        }
      });
    });
  };

  const handleToggleJustification = async (attendanceId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ABSENT" ? "EXCUSED" : "ABSENT";
    const res = await updateAttendanceStatus(attendanceId, nextStatus);
    if (!res.ok) {
        alert("Erreur: " + res.error);
    } else {
        // Rafraîchir les données ou mettre à jour l'état local
        window.location.reload(); 
    }
  };

// ... dans le rendu de la liste ...
// Dans la boucle `students.map`, après avoir vérifié si `selectedLesson` a déjà des `attendances` ...

  if (!selectedLesson) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {initialLessons.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
            <p>Aucun cours prévu pour aujourd'hui.</p>
          </div>
        ) : (
          initialLessons.map((lesson) => (
            <button
              key={lesson.id}
              onClick={() => handleSelectLesson(lesson)}
              className="flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-blue-300 hover:bg-blue-50/30 group"
            >
              <div className="flex w-full justify-between items-start">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
                  {format(new Date(lesson.startTime), 'HH:mm')} - {format(new Date(lesson.endTime), 'HH:mm')}
                </div>
                {lesson.isAttendanceValidated && (
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Appel fait</span>
                )}
              </div>
              <div className="text-lg font-semibold text-slate-900 group-hover:text-blue-700">
                {lesson.isFreeLesson ? (lesson.customSubject || "Cours libre") : (lesson.subject?.name || "Sans matière")}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Classe : {lesson.class.name}
              </div>
              {lesson.room && (
                <div className="mt-3 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  Salle : {lesson.room.name}
                </div>
              )}
            </button>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => setSelectedLesson(null)}
          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          ← Retour à la liste
        </button>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {selectedLesson.isFreeLesson ? (selectedLesson.customSubject || "Cours libre") : (selectedLesson.subject?.name || "Sans matière")} - {selectedLesson.class.name}
          </h2>
          <p className="text-sm text-slate-500">{format(new Date(selectedLesson.startTime), 'EEEE d MMMM', { locale: fr })} | {format(new Date(selectedLesson.startTime), 'HH:mm')} - {format(new Date(selectedLesson.endTime), 'HH:mm')}</p>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-sm font-medium ${feedback.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : "bg-red-50 text-red-800 border border-red-100"}`}>
          {feedback.text}
        </div>
      )}

      {loadErr && (
        <div className="p-4 rounded-xl bg-red-50 text-red-800 border border-red-100 text-sm">
          {loadErr}
        </div>
      )}

      {dispensedStudents.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-xs">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-amber-950 text-sm">
              {dispensedStudents.length} élève{dispensedStudents.length > 1 ? "s" : ""} dispensé{dispensedStudents.length > 1 ? "s" : ""} de cette matière
            </p>
            <p className="text-amber-800 leading-relaxed">
              {dispensedStudents.map((d) => `${d.lastName.toUpperCase()} ${d.firstName}${d.reason ? ` (${d.reason})` : ""}`).join(", ")}
              {" — "}
              <span className="font-semibold text-amber-950">automatiquement exclu{dispensedStudents.length > 1 ? "s" : ""} de la feuille d&apos;appel</span>. Aucune absence ni retard ne leur est imputé.
            </p>
          </div>
        </div>
      )}

      {pendingStudents ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500 text-sm">
          {dispensedStudents.length > 0
            ? "Tous les élèves de cette classe sont dispensés de cette matière. Aucun appel à effectuer."
            : "Aucun élève actif trouvé pour cette classe."}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ring-1 ring-slate-900/[0.04]">
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Élève ({students.length})</span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Présence</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {students.map((s) => {
              const st = states[s.id] || "present";

              return (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 hover:bg-slate-50/50 transition">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                      {s.user.lastName?.[0]}{s.user.firstName?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-xs sm:text-sm truncate" title={`${(s.user.lastName || '').toUpperCase()} ${s.user.firstName || ''}`}>
                        <span className="uppercase">{s.user.lastName}</span> {s.user.firstName}
                      </p>
                      <p className={`text-[10px] font-bold uppercase ${st === 'present' ? 'text-emerald-600' : st === 'absent' ? 'text-red-600' : 'text-orange-600'}`}>
                        {st === 'present' ? 'Présent' : st === 'absent' ? 'Absent' : 'En retard'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      onClick={() => setPresence(s.id, st === "absent" ? "present" : "absent")}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${st === "absent" ? "bg-red-600 text-white shadow-md" : "bg-red-50 text-red-700 hover:bg-red-100"}`}
                    >
                      {st === "absent" ? "Absent" : "Absent ?"}
                    </button>
                    
                    {st === "absent" && (
                        <button
                          onClick={() => setPresence(s.id, "excused")}
                          className="px-2 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100"
                        >
                          Justifier
                        </button>
                    )}
                    {st === "excused" && (
                        <button
                          onClick={() => setPresence(s.id, "absent")}
                          className="px-2 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100"
                        >
                          Annuler
                        </button>
                    )}
                    
                    <button
                      onClick={() => setPresence(s.id, st === "late" ? "present" : "late")}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${st === "late" ? "bg-orange-500 text-white shadow-md" : "bg-orange-50 text-orange-700 hover:bg-orange-100"}`}
                    >
                      Retard
                    </button>

                    {st === "late" && (
                      <button
                        onClick={() => setPresence(s.id, "excused")}
                        className="px-2 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100"
                      >
                        Justifier
                      </button>
                    )}
                    
                    {st === "late" && !lateDurations[s.id] && (
                      <div className="flex items-center gap-1">
                        <input 
                          type="number" 
                          min="0" 
                          placeholder="min"
                          className="w-16 rounded-lg border-slate-200 p-1 text-xs text-slate-900"
                          value={lateDurations[s.id] || ""}
                          onChange={(e) => setLateDurations(prev => ({ ...prev, [s.id]: parseInt(e.target.value) || 0 }))}
                        />
                        <span className="text-[10px] text-slate-400 font-bold">min</span>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="p-6 bg-slate-50 border-t border-slate-100">
            <button
              onClick={handleValidate}
              disabled={pendingSave || students.length === 0}
              className="w-full sm:w-auto px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-slate-800 transition transform active:scale-95 disabled:opacity-50 disabled:scale-100"
            >
              {pendingSave ? "Enregistrement..." : "Valider l'appel définitif"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}