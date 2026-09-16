"use client";

import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  GradePayload, 
  GradeSummaryStats, 
  updateAdminGrade, 
  deleteAdminGrade,
  getAdminRecentGrades
} from "./actions";
import { 
  Award, 
  Search, 
  Filter, 
  BookOpen, 
  Users, 
  GraduationCap, 
  Calendar, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  TrendingUp, 
  TrendingDown, 
  FileText,
  Clock,
  Sparkles
} from "lucide-react";

type Props = {
  initialData: {
    grades: GradePayload[];
    summaryStats: GradeSummaryStats;
  };
  classes: Array<{ id: string; name: string }>;
  subjects: Array<{ id: string; name: string }>;
  teachers: Array<{ id: string; firstName: string; lastName: string }>;
  semesters: Array<{ id: string; name: string }>;
};

export default function RecentGradesClient({
  initialData,
  classes,
  subjects,
  teachers,
  semesters
}: Props) {
  const [grades, setGrades] = useState<GradePayload[]>(initialData.grades);
  const [stats, setStats] = useState<GradeSummaryStats>(initialData.summaryStats);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "90d" | "all">("all");

  // Edit Modal State
  const [editingGrade, setEditingGrade] = useState<GradePayload | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [editCoeff, setEditCoeff] = useState<number>(1);
  const [editComment, setEditComment] = useState<string>("");
  const [editLoading, setEditLoading] = useState(false);

  // Delete Modal State
  const [deletingGradeId, setDeletingGradeId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Refresh data with current filters
  const applyFilters = async () => {
    setLoading(true);
    try {
      const res = await getAdminRecentGrades({
        classId: selectedClassId || undefined,
        subjectId: selectedSubjectId || undefined,
        teacherId: selectedTeacherId || undefined,
        semesterId: selectedSemesterId || undefined,
        search: searchQuery || undefined,
        period: selectedPeriod
      });
      setGrades(res.grades);
      setStats(res.summaryStats);
    } catch (e: any) {
      alert("Erreur lors du filtrage: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = async () => {
    setSearchQuery("");
    setSelectedClassId("");
    setSelectedSubjectId("");
    setSelectedTeacherId("");
    setSelectedSemesterId("");
    setSelectedPeriod("all");

    setLoading(true);
    try {
      const res = await getAdminRecentGrades();
      setGrades(res.grades);
      setStats(res.summaryStats);
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (grade: GradePayload) => {
    setEditingGrade(grade);
    setEditValue(grade.value);
    setEditCoeff(grade.coefficient);
    setEditComment(grade.comment || "");
  };

  // Save Grade Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGrade) return;

    setEditLoading(true);
    try {
      await updateAdminGrade(editingGrade.id, {
        value: Number(editValue),
        coefficient: Number(editCoeff),
        comment: editComment
      });

      // Optimistic update locally
      setGrades(prev => prev.map(g => {
        if (g.id !== editingGrade.id) return g;
        return {
          ...g,
          value: Number(editValue),
          coefficient: Number(editCoeff),
          comment: editComment || null
        };
      }));

      setEditingGrade(null);
    } catch (e: any) {
      alert("Erreur lors de la modification: " + e.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Confirm & Delete Grade
  const handleDeleteGrade = async () => {
    if (!deletingGradeId) return;

    setDeleteLoading(true);
    try {
      await deleteAdminGrade(deletingGradeId);

      setGrades(prev => prev.filter(g => g.id !== deletingGradeId));
      setDeletingGradeId(null);
    } catch (e: any) {
      alert("Erreur lors de la suppression: " + e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const passPct = stats.totalCount > 0 ? Math.round((stats.passingCount / stats.totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-lg">🎓</span>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900">
                Flux des Dernières Notes Émises
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Consultez en direct toutes les notes saisies par les enseignants, filtrez par classe ou matière et contrôlez les saisies.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-violet-50 text-violet-700 font-black text-xs uppercase tracking-widest rounded-xl border border-violet-100 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              {grades.length} Note{grades.length > 1 ? "s" : ""} affichée{grades.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Summary Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notes répertoriées</p>
              <p className="text-xl font-black text-slate-900 mt-1">{stats.totalCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Moyenne Générale</p>
              <p className="text-xl font-black text-blue-600 mt-1">
                {stats.averageValue !== null ? `${stats.averageValue.toFixed(2)} / 20` : "—"}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Award className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Taux de Réussite (≥ 10)</p>
              <p className="text-xl font-black text-emerald-600 mt-1">{passPct}%</p>
              <p className="text-[9px] text-slate-400 font-bold">{stats.passingCount} admis / {stats.failingCount} &lt; 10</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-purple-600">Amplitude Notes</p>
              <p className="text-xl font-black text-purple-600 mt-1">
                {stats.minGrade !== null ? `${stats.minGrade} à ${stats.maxGrade}` : "—"}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <GraduationCap className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Élève, prof, matière..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Class Select */}
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Toutes les classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Subject Select */}
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Toutes les matières</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {/* Teacher Select */}
            <select
              value={selectedTeacherId}
              onChange={e => setSelectedTeacherId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Tous les professeurs</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
              ))}
            </select>

            {/* Period Selector */}
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Toute la période</option>
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
              <option value="90d">90 derniers jours</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              onClick={handleResetFilters}
              className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 tracking-wider transition"
            >
              Réinitialiser les filtres
            </button>

            <button
              onClick={applyFilters}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <Filter className="h-3.5 w-3.5" />
              {loading ? "Chargement..." : "Filtrer les notes"}
            </button>
          </div>
        </div>

        {/* Grades Table / List */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          {grades.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-bold text-sm">
              Aucune note ne correspond aux critères de recherche.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-4">Élève & Classe</th>
                    <th className="py-3.5 px-4">Matière & Semestre</th>
                    <th className="py-3.5 px-4 text-center">Note / 20</th>
                    <th className="py-3.5 px-4">Enseignant</th>
                    <th className="py-3.5 px-4">Appréciation / Commentaire</th>
                    <th className="py-3.5 px-4">Date de saisie</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {grades.map((grade) => {
                    const studentName = `${grade.student.lastName.toUpperCase()} ${grade.student.firstName}`;
                    const formattedDate = format(new Date(grade.createdAt), "dd MMM yyyy à HH:mm", { locale: fr });

                    // Color style for grade badge
                    let gradeBadgeStyle = "bg-red-50 text-red-700 border-red-200";
                    if (grade.value >= 16) gradeBadgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm";
                    else if (grade.value >= 12) gradeBadgeStyle = "bg-blue-50 text-blue-700 border-blue-200";
                    else if (grade.value >= 10) gradeBadgeStyle = "bg-amber-50 text-amber-700 border-amber-200";

                    return (
                      <tr key={grade.id} className="hover:bg-slate-50/80 transition">
                        {/* Student Name & Class */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center uppercase border border-blue-200 shrink-0">
                              {grade.student.firstName ? grade.student.firstName.charAt(0) : '?'}
                            </div>
                            <div>
                              <p className="font-black text-slate-900 leading-tight">{studentName}</p>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 inline-block mt-0.5">
                                {grade.student.className}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Subject & Semester */}
                        <td className="py-3.5 px-4">
                          <p className="font-black text-slate-900 leading-tight">{grade.subjectName}</p>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{grade.semester.name}</span>
                        </td>

                        {/* Grade Value & Coeff */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className={`px-2.5 py-1 rounded-xl font-black text-sm border ${gradeBadgeStyle}`}>
                              {grade.value.toFixed(1)} / 20
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                              Coeff. {grade.coefficient}
                            </span>
                          </div>
                        </td>

                        {/* Teacher Name */}
                        <td className="py-3.5 px-4 text-slate-700 font-bold">
                          {grade.teacher ? `${grade.teacher.firstName} ${grade.teacher.lastName}` : "Non spécifié"}
                        </td>

                        {/* Comment */}
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                          {grade.comment ? (
                            <p className="italic text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 text-[11px] line-clamp-2">
                              &ldquo;{grade.comment}&rdquo;
                            </p>
                          ) : (
                            <span className="text-slate-300 text-[10px] italic">Aucun commentaire</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-slate-400 font-medium text-[11px] whitespace-nowrap">
                          {formattedDate}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(grade)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Modifier la note"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeletingGradeId(grade.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Supprimer la note"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Edit Grade */}
        {editingGrade && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative border border-slate-100">
              <button
                onClick={() => setEditingGrade(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-lg font-black text-slate-900 mb-1 uppercase tracking-wider">Modifier la note</h2>
              <p className="text-xs text-slate-500 font-medium mb-4">
                Élève: <strong className="text-slate-900">{editingGrade.student.lastName.toUpperCase()} {editingGrade.student.firstName}</strong> ({editingGrade.subjectName})
              </p>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Note (/20)</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max="20"
                      value={editValue}
                      onChange={e => setEditValue(Number(e.target.value))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Coefficient</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.1"
                      max="10"
                      value={editCoeff}
                      onChange={e => setEditCoeff(Number(e.target.value))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Appréciation / Commentaire</label>
                  <textarea
                    rows={3}
                    value={editComment}
                    onChange={e => setEditComment(e.target.value)}
                    placeholder="Remarques de l'enseignant..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingGrade(null)}
                    className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-md shadow-blue-500/20 disabled:opacity-50"
                  >
                    {editLoading ? "Enregistrement..." : "Enregistrer la note"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Confirm Delete */}
        {deletingGradeId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative border border-slate-100 text-center space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-600 mx-auto flex items-center justify-center">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase">Supprimer cette note ?</h3>
                <p className="text-xs text-slate-500 mt-1">Cette action est irréversible et mettra à jour les moyennes automatiquement.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDeletingGradeId(null)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteGrade}
                  disabled={deleteLoading}
                  className="w-1/2 py-2.5 bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition shadow-md shadow-red-500/20 disabled:opacity-50"
                >
                  {deleteLoading ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
