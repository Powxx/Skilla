"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveGradesBatch, updateGrade, deleteGrade, type GradeBatchEntry } from "@/app/actions/notes";
import { 
  getStudentsForClassAndSubject, 
  type EnrolledStudent, 
  type DispensedStudent 
} from "./actions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Search, 
  Users, 
  BookOpen, 
  FileText, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  GraduationCap, 
  Hash, 
  Info, 
  Save,
  RotateCcw,
  CheckCheck,
  ArrowDown
} from "lucide-react";

type ClassOption = { id: string; name: string };
type SubjectOption = { id: string; name: string };
type Semester = { 
  id: string; 
  name: string; 
  startDate: string | Date; 
  endDate: string | Date; 
  schoolYear?: { name: string } | null 
};

type ClassSubjectPair = {
  classId: string;
  subjectId: string;
  subjectName: string;
};

type Props = {
  classes: ClassOption[];
  subjects: SubjectOption[];
  classSubjectPairs?: ClassSubjectPair[];
  initialGrades?: any[];
  semesters: Semester[];
};

function parseNote(raw: string): number | null {
  if (!raw || raw.trim() === "") return null;
  const n = Number(String(raw).replace(",", ".").trim());
  if (!Number.isFinite(n)) return null;
  return n;
}

function getGradeBadgeColor(val: number, scale: number = 20) {
  const ratio = scale > 0 ? (val / scale) * 20 : val;
  if (ratio >= 14) return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20";
  if (ratio >= 10) return "bg-sky-50 text-sky-700 border-sky-200 ring-sky-500/20";
  return "bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20";
}

/**
 * Détection automatique intelligente du semestre en fonction de la date saisie.
 */
function findSemesterForDate(dateStr: string, semestersList: Semester[]): Semester | null {
  if (!dateStr || !semestersList || semestersList.length === 0) return null;
  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) return null;

  // 1. Détection stricte dans l'intervalle [startDate, endDate]
  const targetIso = targetDate.toISOString().split("T")[0];
  const directMatch = semestersList.find((s) => {
    const sStart = new Date(s.startDate).toISOString().split("T")[0];
    const sEnd = new Date(s.endDate).toISOString().split("T")[0];
    return targetIso >= sStart && targetIso <= sEnd;
  });
  if (directMatch) return directMatch;

  // 2. Détection du semestre le plus proche temporellement si la date tombe hors bornes
  const targetTime = targetDate.getTime();
  let closest: Semester | null = null;
  let minDiff = Infinity;

  for (const s of semestersList) {
    const start = new Date(s.startDate).getTime();
    const end = new Date(s.endDate).getTime();
    let diff = 0;
    if (targetTime < start) diff = start - targetTime;
    else if (targetTime > end) diff = targetTime - end;
    else diff = 0;

    if (diff < minDiff) {
      minDiff = diff;
      closest = s;
    }
  }

  return closest || semestersList[semestersList.length - 1] || null;
}

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
    <tr key={g.id} className={`hover:bg-slate-50/80 transition-colors ${editingGradeId === g.id ? 'bg-sky-50/40' : ''}`}>
      <td className="px-6 py-4">
        <div className="font-bold text-slate-900">{g.student?.lastName} {g.student?.firstName}</div>
        <div className="text-[11px] text-slate-500">{g.student?.class?.name || "Sans classe"}</div>
      </td>
      <td className="px-6 py-4">
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
          {g.subjectName || "Matière"}
        </span>
        <div className="text-[11px] text-slate-400 mt-1">
          {format(new Date(g.createdAt), "dd MMM yyyy", { locale: fr })}
          {viewMode === 'recent' && g.semester?.name && (
            <span className="ml-2 text-sky-600 font-medium">({g.semester.name})</span>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        {editingGradeId === g.id ? (
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              value={editValue} 
              onChange={(e) => setEditValue(e.target.value)} 
              className="w-14 p-1.5 border border-sky-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-sky-500" 
              title="Note"
            />
            <span className="text-slate-400">/ 20</span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-400">Coef :</span>
            <input 
              type="text" 
              value={editCoeff} 
              onChange={(e) => setEditCoeff(e.target.value)} 
              className="w-12 p-1.5 border border-sky-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-sky-500" 
              title="Coefficient" 
            />
          </div>
        ) : (
          <div className="flex items-baseline gap-1.5">
            <span className={`inline-flex items-center justify-center min-w-[3rem] px-2.5 py-0.5 rounded-full text-sm font-bold border ${getGradeBadgeColor(g.value)}`}>
              {g.value.toLocaleString("fr-FR", { minimumFractionDigits: Number.isInteger(g.value) ? 0 : 1, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-400">/20</span>
            <span className="ml-2 text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              coeff {g.coefficient ?? 1}
            </span>
          </div>
        )}
      </td>
      <td className="px-6 py-4 max-w-[280px] text-slate-600">
        {editingGradeId === g.id ? (
          <input 
            type="text" 
            value={editComment} 
            onChange={(e) => setEditComment(e.target.value)} 
            placeholder="Sujet ou commentaire..."
            className="w-full p-1.5 border border-sky-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500" 
          />
        ) : (
          <div className="text-xs leading-relaxed">
            {g.comment ? (
              <span className="font-medium text-slate-700">{g.comment}</span>
            ) : (
              <span className="text-slate-400 italic">Aucun sujet précisé</span>
            )}
          </div>
        )}
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end gap-1.5">
          {editingGradeId === g.id ? (
            <>
              <button 
                onClick={() => handleSaveEdit(g.id)} 
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition" 
                title="Valider"
              >
                <Check className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setEditingGradeId(null)} 
                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition" 
                title="Annuler"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => handleStartEdit(g)} 
                className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition" 
                title="Modifier"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button 
                onClick={() => handleDelete(g.id)} 
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" 
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function GradeEntryClient({ 
  classes, 
  subjects, 
  classSubjectPairs = [],
  initialGrades = [], 
  semesters 
}: Props) {
  // Sélection principale
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  // Paramètres globaux de l'évaluation
  const [sujet, setSujet] = useState("");
  const [coefficient, setCoefficient] = useState("1"); // Coefficient de base à 1
  const [scale, setScale] = useState("20"); // Barème de notation (sur 20, 10, 5, etc.)
  const [convertOutOf20, setConvertOutOf20] = useState(true); // Convertir sur 20 pour les bulletins
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Détection automatique réactive du semestre selon la date choisie
  const detectedSemester = useMemo(() => {
    return findSemesterForDate(date, semesters);
  }, [date, semesters]);

  const numericScale = useMemo(() => {
    const parsed = parseNote(scale);
    return (parsed !== null && parsed > 0) ? parsed : 20;
  }, [scale]);

  // État des élèves générés
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [dispensedStudents, setDispensedStudents] = useState<DispensedStudent[]>([]);
  const [isPendingStudents, startLoadStudents] = useTransition();
  const [loadError, setLoadError] = useState<string | null>(null);

  // Valeurs saisies par élève : studentId -> note (string)
  const [studentGrades, setStudentGrades] = useState<Record<string, string>>({});
  // Remarques individuelles par élève : studentId -> commentaire (string)
  const [studentRemarks, setStudentRemarks] = useState<Record<string, string>>({});

  // Réfs pour la navigation au clavier (Touche Entrée / Flèche bas)
  const noteInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  // Sauvegarde groupée
  const [isPendingSave, startSave] = useTransition();
  const [saveFeedback, setSaveFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Consultation et historique
  const [recentGrades, setRecentGrades] = useState(initialGrades);
  const [viewMode, setViewMode] = useState<"recent" | "trimester">("recent");
  const [consultationSemesterId, setConsultationSemesterId] = useState(
    detectedSemester?.id || semesters[semesters.length - 1]?.id || ""
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editCoeff, setEditCoeff] = useState("1");
  const [editComment, setEditComment] = useState("");

  // 1. Filtrer les matières disponibles selon la classe sélectionnée
  const availableSubjectsForClass = useMemo(() => {
    if (!classId) return subjects;

    const matchedPairs = classSubjectPairs.filter((p) => p.classId === classId);
    if (matchedPairs.length > 0) {
      const ids = new Set(matchedPairs.map((p) => p.subjectId));
      const filtered = subjects.filter((s) => ids.has(s.id));
      if (filtered.length > 0) return filtered;
    }
    return subjects;
  }, [classId, classSubjectPairs, subjects]);

  // Réinitialiser la matière si elle n'est plus dans la liste de la classe
  useEffect(() => {
    if (subjectId && !availableSubjectsForClass.some((s) => s.id === subjectId)) {
      setSubjectId("");
    }
  }, [availableSubjectsForClass, subjectId]);

  // 2. Charger automatiquement la liste des élèves dès que Classe ET Matière sont choisies
  useEffect(() => {
    setSaveFeedback(null);
    setStudentGrades({});
    setStudentRemarks({});

    if (!classId || !subjectId) {
      setEnrolledStudents([]);
      setDispensedStudents([]);
      setLoadError(null);
      return;
    }

    startLoadStudents(() => {
      setLoadError(null);
      void (async () => {
        try {
          const result = await getStudentsForClassAndSubject(classId, subjectId);
          setEnrolledStudents(result.enrolledStudents);
          setDispensedStudents(result.dispensedStudents);
        } catch {
          setLoadError("Impossible de générer la liste des élèves pour cette classe et cette matière.");
          setEnrolledStudents([]);
          setDispensedStudents([]);
        }
      })();
    });
  }, [classId, subjectId]);

  // Calculs statistiques en temps réel sur les notes saisies
  const stats = useMemo(() => {
    const validGrades: number[] = [];
    for (const s of enrolledStudents) {
      const raw = studentGrades[s.id];
      const parsed = parseNote(raw);
      if (parsed !== null && parsed >= 0 && parsed <= numericScale) {
        validGrades.push(parsed);
      }
    }

    if (validGrades.length === 0) {
      return { count: 0, average: null, min: null, max: null };
    }

    const sum = validGrades.reduce((acc, v) => acc + v, 0);
    const avg = sum / validGrades.length;
    const min = Math.min(...validGrades);
    const max = Math.max(...validGrades);

    return {
      count: validGrades.length,
      average: Math.round(avg * 100) / 100,
      min,
      max
    };
  }, [enrolledStudents, studentGrades, numericScale]);

  // Gestion du changement de note pour un élève
  const handleGradeChange = (studentId: string, value: string) => {
    setStudentGrades((prev) => ({
      ...prev,
      [studentId]: value
    }));
  };

  // Gestion du changement de remarque individuelle pour un élève
  const handleRemarkChange = (studentId: string, value: string) => {
    setStudentRemarks((prev) => ({
      ...prev,
      [studentId]: value
    }));
  };

  // Raccourcis clavier pour naviguer d'élève en élève (Flèche Bas, Flèche Haut, Entrée)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextStudent = enrolledStudents[currentIndex + 1];
      if (nextStudent && noteInputsRef.current[nextStudent.id]) {
        noteInputsRef.current[nextStudent.id]?.focus();
        noteInputsRef.current[nextStudent.id]?.select();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevStudent = enrolledStudents[currentIndex - 1];
      if (prevStudent && noteInputsRef.current[prevStudent.id]) {
        noteInputsRef.current[prevStudent.id]?.focus();
        noteInputsRef.current[prevStudent.id]?.select();
      }
    }
  };

  // Réinitialiser la saisie actuelle
  const handleResetGrades = () => {
    if (stats.count > 0 && !confirm("Effacer toutes les notes actuellement saisies dans la liste ?")) {
      return;
    }
    setStudentGrades({});
    setStudentRemarks({});
  };

  // Soumission groupée des notes saisies
  const handleSubmitBatch = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveFeedback(null);

    if (!classId || !subjectId) {
      setSaveFeedback({
        type: "error",
        message: "Veuillez sélectionner une classe et une matière."
      });
      return;
    }

    if (!sujet.trim()) {
      setSaveFeedback({
        type: "error",
        message: "Veuillez renseigner un sujet ou un intitulé pour cette évaluation (ex: Contrôle continu n°1, Devoir sur table...)."
      });
      return;
    }

    const coeffNum = parseNote(coefficient) || 1;
    if (coeffNum <= 0) {
      setSaveFeedback({
        type: "error",
        message: "Le coefficient doit être un nombre strictement supérieur à 0."
      });
      return;
    }

    // Préparer les entrées à enregistrer (uniquement les élèves pour lesquels une note a été saisie)
    const entriesToSave: GradeBatchEntry[] = [];
    const invalidRows: string[] = [];

    for (const student of enrolledStudents) {
      const raw = studentGrades[student.id];
      if (raw === undefined || raw.trim() === "") {
        // Élève non noté (absent ou non évalué) -> ignoré
        continue;
      }

      const parsed = parseNote(raw);
      if (parsed === null || parsed < 0 || parsed > numericScale) {
        invalidRows.push(`${student.lastName} ${student.firstName} ("${raw}")`);
        continue;
      }

      // Construction de la note enregistrée (ramenée sur 20 si demandé pour les bulletins)
      let finalNote = parsed;
      let noteMention = "";

      if (convertOutOf20 && numericScale !== 20) {
        finalNote = Math.round(((parsed / numericScale) * 20) * 100) / 100;
        noteMention = `(Note : ${parsed}/${numericScale})`;
      } else if (numericScale !== 20) {
        noteMention = `(Noté sur ${numericScale})`;
      }

      // Construction du commentaire combiné (Sujet libre + barème d'origine + Remarque individuelle)
      const userRemark = studentRemarks[student.id]?.trim() || "";
      let finalComment = sujet.trim();
      if (noteMention) {
        finalComment = `${finalComment} ${noteMention}`;
      }
      if (userRemark) {
        finalComment = `${finalComment} — ${userRemark}`;
      }

      entriesToSave.push({
        studentId: student.id,
        note: finalNote,
        matiereId: subjectId,
        coefficient: coeffNum,
        date: new Date(date),
        semesterId: detectedSemester?.id || undefined,
        comment: finalComment,
        scale: numericScale,
        originalNote: parsed
      });
    }

    if (invalidRows.length > 0) {
      setSaveFeedback({
        type: "error",
        message: `Certaines notes sont hors barème (doivent être comprises entre 0 et ${numericScale}) : ${invalidRows.join(", ")}.`
      });
      return;
    }

    if (entriesToSave.length === 0) {
      setSaveFeedback({
        type: "error",
        message: `Aucune note n'a été saisie. Entrez au moins une note sur ${numericScale} dans la liste des élèves.`
      });
      return;
    }

    startSave(() => {
      void saveGradesBatch(entriesToSave).then((res) => {
        if (res.ok) {
          const count = res.count;
          const selectedSubjectName = subjects.find(s => s.id === subjectId)?.name || "la matière";
          const selectedClassName = classes.find(c => c.id === classId)?.name || "la classe";

          setSaveFeedback({
            type: "success",
            message: `🎉 ${count} note(s) enregistrée(s) avec succès pour la classe ${selectedClassName} en ${selectedSubjectName} ! (Période : ${detectedSemester?.name || "Semestre actif"}, Sujet : "${sujet.trim()}", Coeff : ${coeffNum})`
          });

          // Réinitialiser les champs de saisie des élèves
          setStudentGrades({});
          setStudentRemarks({});

          // Recharger les notes récentes dans la vue consultation
          const newEntriesForView = entriesToSave.map((entry, idx) => {
            const stu = enrolledStudents.find(s => s.id === entry.studentId);
            return {
              id: `temp-${Date.now()}-${idx}`,
              value: entry.note,
              coefficient: entry.coefficient ?? 1,
              subjectName: selectedSubjectName,
              comment: entry.comment,
              createdAt: entry.date ? new Date(entry.date).toISOString() : new Date().toISOString(),
              student: {
                firstName: stu?.firstName || "",
                lastName: stu?.lastName || "",
                class: { name: selectedClassName }
              },
              semester: detectedSemester
            };
          });

          setRecentGrades(prev => [...newEntriesForView, ...prev]);
        } else {
          setSaveFeedback({
            type: "error",
            message: res.error || "Une erreur est survenue lors de l'enregistrement."
          });
        }
      });
    });
  };

  // Édition d'une note existante dans la table de consultation
  const handleStartEdit = (g: any) => {
    setEditingGradeId(g.id);
    setEditValue(String(g.value));
    setEditCoeff(String(g.coefficient ?? 1));
    setEditComment(g.comment || "");
  };

  const handleSaveEdit = async (id: string) => {
    const val = parseNote(editValue);
    const coeff = parseNote(editCoeff) || 1;

    if (val === null || val < 0 || val > 20) {
      alert("La note doit être comprise entre 0 et 20.");
      return;
    }

    const res = await updateGrade(id, val, coeff, editComment.trim() || null);
    if (res.ok) {
      setRecentGrades(prev => prev.map(g => {
        if (g.id !== id) return g;
        return {
          ...g,
          value: val,
          coefficient: coeff,
          comment: editComment.trim() || null
        };
      }));
      setEditingGradeId(null);
    } else {
      alert("Erreur lors de la modification : " + (res.error || ""));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer définitivement cette note ? Cette action est irréversible.")) return;
    const res = await deleteGrade(id);
    if (res.ok) {
      setRecentGrades(prev => prev.filter(g => g.id !== id));
    } else {
      alert("Erreur lors de la suppression : " + (res.error || ""));
    }
  };

  // Filtrage pour la table de consultation
  const filteredGrades = useMemo(() => {
    let source = recentGrades;
    if (viewMode === "trimester" && consultationSemesterId) {
      source = recentGrades.filter((g: any) => g.semesterId === consultationSemesterId);
    }

    if (!searchQuery.trim()) return source;
    const q = searchQuery.toLowerCase();
    return source.filter((g: any) => 
      g.student?.lastName?.toLowerCase().includes(q) || 
      g.student?.firstName?.toLowerCase().includes(q) ||
      g.subjectName?.toLowerCase().includes(q) ||
      g.comment?.toLowerCase().includes(q)
    );
  }, [recentGrades, searchQuery, viewMode, consultationSemesterId]);

  return (
    <div className="mx-auto max-w-7xl xl:max-w-[1440px] px-4 sm:px-6 lg:px-8 pb-24">
      {/* En-tête de page moderne et spacieux */}
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-500/20">
                <GraduationCap className="h-6 w-6" />
              </span>
              Saisie des notes
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 max-w-3xl">
              Choisissez votre groupe et votre matière pour noter les élèves en quelques clics. La période pédagogique est automatiquement attribuée selon la date du devoir.
            </p>
          </div>

          {detectedSemester && (
            <div className="hidden lg:flex items-center gap-3 bg-white border border-slate-200/90 rounded-2xl px-4 py-2.5 shadow-sm">
              <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xs">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Période en cours
                </span>
                <span className="text-xs font-black text-slate-800">
                  {detectedSemester.name}
                  {detectedSemester.schoolYear?.name && ` (${detectedSemester.schoolYear.name})`}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ZONE DE CONFIGURATION DE LA SESSION DE NOTATION (Responsive Optimisé Ordinateur) */}
      <section className="mb-8">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
          
          {/* Étape 1 : Choix Classe & Matière */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-black text-sky-700 shadow-xs">
                1
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Sélection du groupe et de la matière
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
              {/* Classe */}
              <div className="lg:col-span-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-sky-600" />
                  Classe <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={classId}
                    onChange={(e) => {
                      setClassId(e.target.value);
                      setSubjectId("");
                    }}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all shadow-sm"
                  >
                    <option value="">Sélectionner une classe...</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Matière */}
              <div className="lg:col-span-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-sky-600" />
                  Matière <span className="text-rose-500">*</span>
                </label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  disabled={!classId}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!classId ? "Choisissez d'abord une classe" : "Sélectionner une matière..."}
                  </option>
                  {availableSubjectsForClass.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Étape 2 : Paramètres de l'évaluation (Desktop Responsive & Détection Automatique du Semestre) */}
          <div className="pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-black text-sky-700 shadow-xs">
                2
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Paramètres de l'évaluation
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 items-start">
              {/* Sujet libre */}
              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-sky-600" />
                  Sujet / Intitulé <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={sujet}
                  onChange={(e) => setSujet(e.target.value)}
                  placeholder="ex: Contrôle continu n°1, TP noté..."
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all shadow-sm"
                />
              </div>

              {/* Barème de notation (sur 20, 10, etc.) */}
              <div className="sm:col-span-1 lg:col-span-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-sky-600" />
                    Barème / Noté sur
                  </span>
                  <div className="flex gap-1 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setScale("20")}
                      className={`px-1.5 py-0.5 rounded transition ${scale === "20" ? "bg-sky-600 text-white font-bold" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      /20
                    </button>
                    <button
                      type="button"
                      onClick={() => setScale("10")}
                      className={`px-1.5 py-0.5 rounded transition ${scale === "10" ? "bg-sky-600 text-white font-bold" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      /10
                    </button>
                    <button
                      type="button"
                      onClick={() => setScale("5")}
                      className={`px-1.5 py-0.5 rounded transition ${scale === "5" ? "bg-sky-600 text-white font-bold" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      /5
                    </button>
                    <button
                      type="button"
                      onClick={() => setScale("40")}
                      className={`px-1.5 py-0.5 rounded transition ${scale === "40" ? "bg-sky-600 text-white font-bold" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      /40
                    </button>
                  </div>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">/</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="0.5"
                    value={scale}
                    onChange={(e) => setScale(e.target.value)}
                    placeholder="20"
                    className="w-full h-11 pl-7 pr-3 rounded-xl border border-slate-200 bg-white text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all shadow-sm"
                    title="Total des points pour cette évaluation (ex: 20, 10, 5, 40)"
                  />
                </div>
              </div>

              {/* Coefficient de base à 1 */}
              <div className="sm:col-span-1 lg:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-sky-600" />
                  Coefficient <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={coefficient}
                  onChange={(e) => setCoefficient(e.target.value)}
                  placeholder="1"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-mono font-bold text-slate-900 text-center focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all shadow-sm"
                  title="Coefficient de l'évaluation (par défaut 1)"
                />
              </div>

              {/* Date */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-sky-600" />
                  Date de l'évaluation
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all shadow-sm"
                />
              </div>
            </div>

            {/* DÉTECTION AUTOMATIQUE DE LA PÉRIODE SELON LA DATE */}
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-sky-50/90 via-sky-50/50 to-indigo-50/40 border border-sky-100 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/20 shrink-0">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-700">
                      Période pédagogique détectée automatiquement
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-100 text-sky-700 border border-sky-200">
                      <CheckCheck className="h-3 w-3 text-sky-600" />
                      Auto-détecté
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-800 mt-0.5 flex flex-wrap items-center gap-2">
                    {detectedSemester ? (
                      <>
                        <span className="text-slate-900 font-black">{detectedSemester.name}</span>
                        {detectedSemester.schoolYear?.name && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/90 border border-sky-200 text-sky-800">
                            Année {detectedSemester.schoolYear.name}
                          </span>
                        )}
                        {detectedSemester.startDate && detectedSemester.endDate && (
                          <span className="text-xs text-slate-500 font-normal hidden sm:inline">
                            (du {format(new Date(detectedSemester.startDate), "dd/MM/yyyy")} au {format(new Date(detectedSemester.endDate), "dd/MM/yyyy")})
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-amber-700 font-medium">Aucun semestre correspondant en base. La note sera rattachée au dernier semestre actif.</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-500 font-medium bg-white/80 px-3 py-1.5 rounded-xl border border-sky-100 self-start md:self-auto shrink-0">
                Période automatiquement assignée aux bulletins
              </div>
            </div>

            {/* Option de conversion sur 20 pour la moyenne générale */}
            {numericScale !== 20 && (
              <div className="mt-3.5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-amber-900">
                  <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    Évaluation notée sur <strong>{numericScale}</strong>.
                  </span>
                </div>
                <label className="flex items-center gap-2 font-medium text-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={convertOutOf20}
                    onChange={(e) => setConvertOutOf20(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
                  />
                  <span>
                    Ramener sur 20 pour le calcul de la moyenne du bulletin (ex : 8/{numericScale} → {((8 / numericScale) * 20).toFixed(1)}/20)
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* MESSAGE DE RETOUR SAUVEGARDE */}
      {saveFeedback && (
        <div 
          className={`mb-8 p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
            saveFeedback.type === "success" 
              ? "bg-emerald-50/90 border-emerald-200 text-emerald-900" 
              : "bg-rose-50/90 border-rose-200 text-rose-900"
          }`}
        >
          {saveFeedback.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
          )}
          <div className="text-sm font-medium leading-relaxed">
            {saveFeedback.message}
          </div>
        </div>
      )}

      {/* ÉTAPE 3 : LISTE GÉNÉRÉE DES ÉLÈVES (Responsive Optimisé Ordinateur) */}
      <section className="mb-14">
        {(!classId || !subjectId) ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-500">
            <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-700">Aucune sélection en cours</h3>
            <p className="mt-1 text-sm text-slate-400 max-w-md mx-auto">
              Choisissez une classe et une matière ci-dessus pour générer automatiquement la liste des élèves à noter.
            </p>
          </div>
        ) : isPendingStudents ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-sky-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-sm font-semibold text-slate-600">
              Génération de la liste des élèves qui ont cette matière...
            </p>
          </div>
        ) : loadError ? (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-rose-700 text-sm flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{loadError}</span>
          </div>
        ) : enrolledStudents.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center text-amber-800">
            <Info className="h-8 w-8 mx-auto mb-2 text-amber-600" />
            <h4 className="font-bold">Aucun élève trouvé pour cette matière</h4>
            <p className="text-xs text-amber-700 mt-1">
              Tous les élèves de cette classe sont peut-être dispensés de cette matière ou aucun élève actif n'est rattaché à cette classe.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitBatch} className="space-y-4">
            {/* Bannière information dispenses si applicable */}
            {dispensedStudents.length > 0 && (
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-amber-900 animate-in fade-in duration-300">
                <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-bold">
                    {dispensedStudents.length} élève{dispensedStudents.length > 1 ? "s" : ""} dispensé{dispensedStudents.length > 1 ? "s" : ""}
                  </span>{" "}
                  de cette matière ({dispensedStudents.map(d => `${d.lastName} ${d.firstName}`).join(", ")}) —{" "}
                  <span className="text-amber-700">automatiquement exclu{dispensedStudents.length > 1 ? "s" : ""} de la liste de notation</span>.
                </div>
              </div>
            )}

            {/* Barre d'action et Statistiques collante en haut sur ordinateur (Sticky) */}
            <div className="sticky top-4 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 p-4 shadow-lg shadow-slate-900/5 flex flex-wrap items-center justify-between gap-4 transition-all">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Élèves à noter
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-slate-800">
                      {stats.count} <span className="text-xs font-semibold text-slate-400">/ {enrolledStudents.length} saisis</span>
                    </span>
                    <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                      {Math.round((stats.count / enrolledStudents.length) * 100)}%
                    </span>
                  </div>
                </div>

                <div className="h-8 w-px bg-slate-200 hidden sm:block" />

                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Moyenne du groupe
                  </span>
                  <span className="text-lg font-black text-sky-600 font-mono">
                    {stats.average !== null ? `${stats.average.toLocaleString("fr-FR")} / ${numericScale}` : "—"}
                  </span>
                </div>

                {stats.min !== null && stats.max !== null && (
                  <>
                    <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span>Min : <strong className="text-slate-800 font-mono">{stats.min}</strong></span>
                      <span>Max : <strong className="text-slate-800 font-mono">{stats.max}</strong></span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {stats.count > 0 && (
                  <button
                    type="button"
                    onClick={handleResetGrades}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition flex items-center gap-1.5"
                    title="Effacer les notes saisies"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Effacer la saisie</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isPendingSave || stats.count === 0}
                  className="h-11 px-6 bg-sky-600 hover:bg-sky-700 active:scale-[0.99] text-white text-sm font-bold rounded-xl transition shadow-lg shadow-sky-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isPendingSave ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Enregistrer {stats.count > 0 ? `(${stats.count} note${stats.count > 1 ? "s" : ""})` : ""}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Tableau interactif de saisie des notes optimisé pour ordinateur */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50/90 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 w-12 text-center">#</th>
                      <th className="px-6 py-4 min-w-[220px]">Élève</th>
                      <th className="px-6 py-4 w-44">Note (/{numericScale})</th>
                      <th className="px-6 py-4 min-w-[300px]">Remarque individuelle (optionnel)</th>
                      <th className="px-6 py-4 w-36 text-center">Statut & Bulletin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {enrolledStudents.map((student, idx) => {
                      const rawNote = studentGrades[student.id] || "";
                      const parsed = parseNote(rawNote);
                      const isValidNote = parsed !== null && parsed >= 0 && parsed <= numericScale;
                      const hasError = rawNote.trim() !== "" && !isValidNote;

                      return (
                        <tr 
                          key={student.id} 
                          className={`hover:bg-slate-50/80 focus-within:bg-sky-50/40 focus-within:ring-1 focus-within:ring-sky-200 transition-colors ${isValidNote ? 'bg-sky-50/20' : ''}`}
                        >
                          <td className="px-6 py-3.5 text-center text-xs font-mono text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0">
                                {student.firstName?.[0] || ""}{student.lastName?.[0] || ""}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block text-sm">
                                  {student.lastName.toUpperCase()} {student.firstName}
                                </span>
                                {student.email && (
                                  <span className="text-[11px] text-slate-400 block truncate max-w-[220px]">
                                    {student.email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="relative">
                              <input
                                ref={(el) => {
                                  noteInputsRef.current[student.id] = el;
                                }}
                                type="text"
                                value={rawNote}
                                onChange={(e) => handleGradeChange(student.id, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, idx)}
                                placeholder={`0 à ${numericScale}`}
                                className={`w-36 h-11 px-3.5 text-center rounded-xl font-mono text-sm font-bold border transition-all ${
                                  hasError 
                                    ? "border-rose-400 bg-rose-50 text-rose-700 focus:ring-2 focus:ring-rose-400" 
                                    : isValidNote 
                                    ? "border-sky-300 bg-sky-50/50 text-slate-900 focus:ring-2 focus:ring-sky-500 font-extrabold" 
                                    : "border-slate-200 bg-white text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                                }`}
                              />
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <input
                              type="text"
                              value={studentRemarks[student.id] || ""}
                              onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                              placeholder="ex: Très bon investissement, soigner la rédaction..."
                              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all bg-white"
                            />
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            {isValidNote ? (
                              <div className="inline-flex flex-col items-center">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getGradeBadgeColor(parsed!, numericScale)}`}>
                                  {parsed} / {numericScale}
                                </span>
                                {convertOutOf20 && numericScale !== 20 && (
                                  <span className="text-[11px] text-slate-500 font-mono font-medium mt-1">
                                    → {((parsed! / numericScale) * 20).toFixed(1)}/20
                                  </span>
                                )}
                              </div>
                            ) : rawNote.trim() !== "" ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                Invalide
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 italic">
                                Non noté
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pied de tableau avec rappel bouton Enregistrer et astuces clavier */}
              <div className="bg-slate-50/70 p-4 px-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <span className="font-semibold text-slate-700">Astuce clavier :</span> utilisez les touches <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-xs font-semibold">Entrée</kbd> ou <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-xs font-semibold">↓</kbd> pour passer directement à l'élève suivant.
                </p>

                <button
                  type="submit"
                  disabled={isPendingSave || stats.count === 0}
                  className="h-10 px-5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-sky-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Enregistrer les notes</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </section>

      {/* SECTION CONSULTATION ET HISTORIQUE (Responsive Ordinateur Spacieux) */}
      <section className="pt-8 border-t border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-sky-600" />
              Historique et consultation des notes
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Consultez, modifiez ou supprimez les évaluations précédemment saisies.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                type="button"
                onClick={() => setViewMode("recent")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === "recent" ? 'bg-white text-sky-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Récentes
              </button>
              <button 
                type="button"
                onClick={() => setViewMode("trimester")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === "trimester" ? 'bg-white text-sky-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Par Trimestre / Semestre
              </button>
            </div>

            {viewMode === "trimester" && (
              <select 
                value={consultationSemesterId} 
                onChange={(e) => setConsultationSemesterId(e.target.value)}
                className="py-1.5 pl-3 pr-8 rounded-xl border-slate-200 text-xs font-medium focus:ring-sky-500 focus:border-sky-500 bg-white"
              >
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.schoolYear?.name ? ` (${s.schoolYear.name})` : ''}
                  </option>
                ))}
              </select>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Chercher élève, sujet..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 rounded-xl border-slate-200 text-xs focus:ring-sky-500 focus:border-sky-500 w-full sm:w-56 bg-white"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Élève / Classe</th>
                  <th className="px-6 py-4">Matière</th>
                  <th className="px-6 py-4">Note / Coeff</th>
                  <th className="px-6 py-4">Sujet / Commentaire</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGrades.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                      Aucune note trouvée dans cette vue.
                    </td>
                  </tr>
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
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
