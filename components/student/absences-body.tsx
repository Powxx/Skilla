import type { Attendance, User, Class, Lesson, Subject } from "@prisma/client";

function statusLabel(status: string) {
  if (status === "EXCUSED") return "Justifié";
  return "Non justifié";
}

function isJustifiedAttendance(status: string) {
  return status === "EXCUSED";
}

function typeLabel(status: string) {
  if (status === "ABSENT") return "Absence";
  if (status === "LATE") return "Retard";
  if (status === "EXCUSED") return "Absence justifiée";
  return status;
}

type AttendanceWithLesson = Attendance & {
  lesson: Lesson & { subject: Subject };
  lateDuration?: number | null;
};

type Props = {
  student: User & {
    class: Class | null;
    attendances: AttendanceWithLesson[];
  };
  contextNote?: string;
};

export default function AbsencesBody({ student, contextNote }: Props) {
  const absencesOnly = student.attendances.filter(
    (a) => a.status === "ABSENT" || a.status === "EXCUSED",
  );
  const retardsOnly = student.attendances.filter(
    (a) => a.status === "LATE",
  );

  return (
    <div className="h-full flex flex-col gap-6 font-sans text-slate-900">
      {contextNote && (
        <div className="px-4 py-2 rounded-xl border border-sky-100 bg-sky-50 text-[10px] font-bold text-sky-700 uppercase tracking-widest shrink-0">
          {contextNote}
        </div>
      )}

      <header className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase tracking-widest">
            Absences & Retards
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {student.lastName} {student.firstName} • {student.class?.name ?? "Non assignée"}
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 shrink-0">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Absences</p>
            <p className="mt-1 text-3xl font-black tabular-nums text-red-600">{absencesOnly.length}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center border border-red-100 text-red-400">🚫</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Retards</p>
            <p className="mt-1 text-3xl font-black tabular-nums text-amber-600">{retardsOnly.length}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100 text-amber-400">⏳</div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
          <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Historique détaillé</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {student.attendances.length === 0 ? (
            <div className="h-full flex items-center justify-center p-12 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
              Aucun événement enregistré.
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {student.attendances.map((a) => {
                if (a.status === "PRESENT") return null;

                const justified = isJustifiedAttendance(a.status);

                return (
                  <li key={a.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition group">
                    <div className={`h-2 w-2 shrink-0 rounded-full ${justified ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse'}`} />
                    
                    <div className="min-w-[80px] text-[10px] font-black text-slate-400 uppercase tabular-nums">
                      {new Date(a.lesson.startTime).toLocaleDateString("fr-FR", {
                        weekday: "short",
                        day: "numeric",
                        month: "short"
                      })}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                          a.status === "ABSENT" || a.status === "EXCUSED"
                            ? "bg-red-50 text-red-700 border-red-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}>
                          {typeLabel(a.status)}
                        </span>
                        <span className="text-[11px] font-black text-slate-900 uppercase truncate">
                          {a.lesson.subject.name}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-1">
                         <span className="text-[9px] font-bold text-slate-400 uppercase">{statusLabel(a.status)}</span>
                         {a.status === "LATE" && a.lateDuration && (
                            <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1 rounded uppercase tracking-tighter">+{a.lateDuration} min</span>
                         )}
                      </div>

                      {a.reason && (
                        <p className="text-[10px] text-slate-500 italic mt-1 line-clamp-1 opacity-70">
                          &ldquo;{a.reason}&rdquo;
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
