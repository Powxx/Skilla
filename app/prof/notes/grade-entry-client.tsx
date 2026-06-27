"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { saveGradesBatch, updateGrade, deleteGrade } from "@/app/actions/notes";
import { getStudentsByClass, type StudentForGradeEntry } from "./actions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Trash2, Edit2, Check, X, Search } from "lucide-react";

type ClassOption = { id: string; name: string };
type SubjectOption = { id: string; name: string };
type Semester = { id: string; name: string; startDate: string; endDate: string; schoolYear?: { name: string } | null };

type Props = {
  classes: ClassOption[];
  subjects: SubjectOption[];
  initialGrades?: any[];
  semesters: Semester[];
};

type UiResult =
  | { error: string }
  | { savedCount: number }
  | null;

function GradeRow({ 
    g, 
    editingGradeId, 
    editValue, 
    setEditValue, 
    editCoeff, 
    setEditCoeff, 
    editComment, 
    setEditComment, 
    handleSaveEdit, 
    setEditingGradeId, 
    handleStartEdit, 
    handleDelete,
    viewMode
}: any) {
    return (
        <tr key={g.id} className={`hover:bg-slate-50 transition-colors ${editingGradeId === g.id ? 'bg-sky-50/30' : ''}`}>
            <td className="px-6 py-4">
                <div className="font-bold text-slate-900">{g.student.lastName} {g.student.firstName}</div>
                <div className="text-[10px] text-slate-500">{g.student.class?.name || "Sans classe"}</div>
            </td>
            <td className="px-6 py-4">
                <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-medium">{g.subjectName}</span>
                <div className="text-[10px] text-slate-400 mt-1">
                    {format(new Date(g.createdAt), "dd MMM yyyy", { locale: fr })}
                    {viewMode === 'recent' && <span className="ml-2 text-sky-600 font-medium">({g.semester?.name})</span>}
                </div>
            </td>
            <td className="px-6 py-4">
                {editingGradeId === g.id ? (
                    <div className="flex gap-2">
                        <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-12 p-1 border rounded font-mono text-xs" />
                        <span className="text-slate-300">/</span>
                        <input type="text" value={editCoeff} onChange={(e) => setEditCoeff(e.target.value)} className="w-10 p-1 border rounded font-mono text-xs" title="Coefficient" />
                    </div>
                ) : (
                    <div className="flex items-baseline gap-1">
                        <span className="text-base font-black text-slate-900">{g.value}</span>
                        <span className="text-[10px] text-slate-400">/20</span>
                        <span className="ml-2 text-[10px] font-bold text-sky-600">x{g.coefficient}</span>
                    </div>
                )}
            </td>
            <td className="px-6 py-4 max-w-[200px] truncate text-slate-500">
                {editingGradeId === g.id ? (
                    <input type="text" value={editComment} onChange={(e) => setEditComment(e.target.value)} className="w-full p-1 border rounded text-xs" />
                ) : (
                    g.comment || "-"
                )}
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2">
                    {editingGradeId === g.id ? (
                        <>
                            <button onClick={() => handleSaveEdit(g.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Valider">
                                <Check className="h-4 w-4" />
                            </button>
                            <button onClick={() => setEditingGradeId(null)} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg transition" title="Annuler">
                                <X className="h-4 w-4" />
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => handleStartEdit(g)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition" title="Modifier">
                                <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDelete(g.id)} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition" title="Supprimer">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </>
                    )}
                </div>
            </td>
        </tr>
    );
}

function parseNote(raw: string): number | null {
  const n = Number(String(raw).replace(",", ".").trim());
  if (!Number.isFinite(n)) return null;
  return n;
}

export default function GradeEntryClient({ classes, subjects, initialGrades = [], semesters }: Props) {
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [students, setStudents] = useState<StudentForGradeEntry[]>([]);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [coefficient, setCoefficient] = useState("1");
  const [comment, setComment] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [, setResult] = useState<UiResult>(null);
  const [isPendingStudents, startLoadStudents] = useTransition();
  const [isPendingSave, startSave] = useTransition();
  const [viewMode, setViewMode] = useState<"recent" | "trimester">("recent");
  const [selectedSemesterId, setSelectedSemesterId] = useState(semesters[semesters.length - 1]?.id || "");

  // Gestion de la liste des notes précédentes
  const [recentGrades] = useState(initialGrades);
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editCoeff, setEditCoeff] = useState("");
  const [editComment, setEditComment] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setStudentId("");
    setSubjectId("");
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

  const filteredGrades = useMemo(() => {
    let source = recentGrades;
    if (viewMode === "trimester" && selectedSemesterId) {
        source = recentGrades.filter((g: any) => g.semesterId === selectedSemesterId);
    }

    if (!searchQuery.trim()) return source;
    const q = searchQuery.toLowerCase();
    return source.filter((g: any) => 
        g.student.lastName?.toLowerCase().includes(q) || 
        g.student.firstName?.toLowerCase().includes(q) ||
        g.subjectName?.toLowerCase().includes(q)
    );
  }, [recentGrades, searchQuery, viewMode, selectedSemesterId]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResult(null);

    if (!subjectId || !classId || !studentId) {
      setResult({
        error: "Sélectionnez une classe, un élève et une matière avant d’enregistrer.",
      });
      return;
    }

    const parsed = parseNote(note);
    if (parsed === null || parsed < 0 || parsed > 20) {
      setResult({ error: "Saisissez une note valide entre 0 et 20." });
      return;
    }

    const coefNum = parseNote(coefficient) || 1;
    if (coefNum <= 0) {
      setResult({ error: "Le coefficient doit être positif." });
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
          setNote("");
          setCoefficient("1");
          setComment("");
          window.location.reload(); 
        } else {
          setResult({ error: res.error });
        }
      });
    });
  };

  const handleStartEdit = (g: any) => {
    setEditingGradeId(g.id);
    setEditValue(String(g.value));
    setEditCoeff(String(g.coefficient));
    setEditComment(g.comment || "");
  };

  const handleSaveEdit = async (id: string) => {
    const val = parseNote(editValue);
    const co = parseNote(editCoeff);
    if (val === null || co === null) return;

    const res = await updateGrade(id, val, co, editComment);
    if (res.ok) {
      setEditingGradeId(null);
      window.location.reload();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette note ? Cette action est irréversible.")) return;
    const res = await deleteGrade(id);
    if (res.ok) {
      window.location.reload();
    }
  };

  const canEnterGrades = Boolean(subjectId && classId && studentId) && !loadError;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Gestion des notes
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Saisissez de nouvelles notes ou modifiez les évaluations déjà enregistrées.
        </p>
      </header>

      {/* ZONE DE SAISIE */}
      <section className="mb-12">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="grid gap-4 md:grid-cols-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wider">Classe</span>
                    <select value={classId} onChange={(e) => {
                        const val = e.target.value;
                        setClassId(val);
                        setStudentId("");
                        setSubjectId("");
                    }} className="w-full rounded-xl border-slate-200 text-sm focus:ring-sky-500 focus:border-sky-500">
                        <option value="">Choisir...</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </label>
                <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wider">Élève</span>
                    <select value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={!classId || isPendingStudents} className="w-full rounded-xl border-slate-200 text-sm focus:ring-sky-500 focus:border-sky-500 disabled:opacity-50">
                        <option value="">{isPendingStudents ? "Chargement..." : "Choisir..."}</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.user.lastName} {s.user.firstName}</option>)}
                    </select>
                </label>
                <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wider">Matière</span>
                    <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!studentId} className="w-full rounded-xl border-slate-200 text-sm focus:ring-sky-500 focus:border-sky-500 disabled:opacity-50">
                        <option value="">Choisir...</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </label>
            </div>

            {canEnterGrades && (
                <div className="bg-sky-50/50 p-6 rounded-2xl border border-sky-100 grid gap-4 sm:grid-cols-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="sm:col-span-1">
                        <span className="mb-1.5 block text-xs font-bold text-sky-700 uppercase tracking-wider">Note /20</span>
                        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="14.5" className="w-full rounded-xl border-sky-200 text-sm font-mono focus:ring-sky-500 focus:border-sky-500" />
                    </div>
                    <div className="sm:col-span-1">
                        <span className="mb-1.5 block text-xs font-bold text-sky-700 uppercase tracking-wider">Date</span>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border-sky-200 text-sm focus:ring-sky-500 focus:border-sky-500" />
                    </div>
                    <div className="sm:col-span-1">
                        <span className="mb-1.5 block text-xs font-bold text-sky-700 uppercase tracking-wider">Coeff</span>
                        <input type="text" value={coefficient} onChange={(e) => setCoefficient(e.target.value)} className="w-full rounded-xl border-sky-200 text-sm focus:ring-sky-500 focus:border-sky-500" />
                    </div>
                    <div className="sm:col-span-1 flex items-end">
                        <button type="submit" disabled={isPendingSave} className="w-full h-[38px] bg-sky-600 text-white rounded-xl text-sm font-bold hover:bg-sky-700 transition shadow-lg shadow-sky-600/20 disabled:opacity-50">
                            {isPendingSave ? "..." : "Enregistrer"}
                        </button>
                    </div>
                    <div className="sm:col-span-4">
                        <span className="mb-1.5 block text-xs font-bold text-sky-700 uppercase tracking-wider">Commentaire</span>
                        <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Remarque pour le bulletin..." className="w-full rounded-xl border-sky-200 text-sm focus:ring-sky-500 focus:border-sky-500" />
                    </div>
                </div>
            )}
        </form>
      </section>

      {/* LISTE DES NOTES */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold text-slate-900">Consultation</h2>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setViewMode("recent")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === "recent" ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Récentes
                    </button>
                    <button 
                        onClick={() => setViewMode("trimester")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === "trimester" ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Par Trimestre
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                {viewMode === "trimester" && (
                    <select 
                        value={selectedSemesterId} 
                        onChange={(e) => setSelectedSemesterId(e.target.value)}
                        className="py-2 pl-3 pr-8 rounded-xl border-slate-200 text-sm focus:ring-sky-500 focus:border-sky-500 bg-white"
                    >
                        {semesters.map(s => <option key={s.id} value={s.id}>{s.name}{s.schoolYear?.name ? ` (${s.schoolYear.name})` : ''}</option>)}
                    </select>
                )}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Chercher..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 rounded-xl border-slate-200 text-sm focus:ring-sky-500 focus:border-sky-500 w-full sm:w-48"
                    />
                </div>
            </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Élève / Classe</th>
                            <th className="px-6 py-4">Matière</th>
                            <th className="px-6 py-4">Note / Coeff</th>
                            <th className="px-6 py-4">Commentaire</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredGrades.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Aucune note trouvée</td></tr>
                        ) : (
                            // Groupement par matière si on est en mode trimestre et qu'on ne cherche pas spécifiquement
                            viewMode === "trimester" && !searchQuery ? (
                                Object.entries(
                                    filteredGrades.reduce((acc: any, g: any) => {
                                        const sub = g.subjectName || "Inconnue";
                                        if (!acc[sub]) acc[sub] = [];
                                        acc[sub].push(g);
                                        return acc;
                                    }, {})
                                ).map(([subjectName, subjectGrades]: [string, any]) => (
                                    <React.Fragment key={subjectName}>
                                        <tr className="bg-slate-50/50">
                                            <td colSpan={5} className="px-6 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100/30">
                                                {subjectName} — {subjectGrades.length} évaluation(s)
                                            </td>
                                        </tr>
                                        {subjectGrades.map((g: any) => (
                                            <GradeRow 
                                                key={g.id} 
                                                g={g} 
                                                editingGradeId={editingGradeId}
                                                editValue={editValue}
                                                setEditValue={setEditValue}
                                                editCoeff={editCoeff}
                                                setEditCoeff={setEditCoeff}
                                                editComment={editComment}
                                                setEditComment={setEditComment}
                                                handleSaveEdit={handleSaveEdit}
                                                setEditingGradeId={setEditingGradeId}
                                                handleStartEdit={handleStartEdit}
                                                handleDelete={handleDelete}
                                                viewMode={viewMode}
                                            />
                                        ))}
                                    </React.Fragment>
                                ))
                            ) : (
                                filteredGrades.map((g: any) => (
                                    <GradeRow 
                                        key={g.id} 
                                        g={g} 
                                        editingGradeId={editingGradeId}
                                        editValue={editValue}
                                        setEditValue={setEditValue}
                                        editCoeff={editCoeff}
                                        setEditCoeff={setEditCoeff}
                                        editComment={editComment}
                                        setEditComment={setEditComment}
                                        handleSaveEdit={handleSaveEdit}
                                        setEditingGradeId={setEditingGradeId}
                                        handleStartEdit={handleStartEdit}
                                        handleDelete={handleDelete}
                                        viewMode={viewMode}
                                    />
                                ))
                            )
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </section>
    </div>
  );
}
