"use client";

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  BookMarked,
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  X,
  Bell,
  Sparkles,
  BookOpen,
  Send,
  Loader2,
  Users,
  Check
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getLessonHomeworkStats, adminToggleStudentHomeworkDone } from "@/app/actions/homework";

export interface TeacherLessonHomework {
  id: string;
  startTime: string; // ISO
  endTime: string; // ISO
  classId: string;
  className: string;
  subjectId: string | null;
  subjectName: string;
  homework: string | null;
  summary: string | null;
  totalStudents?: number;
  completedCount?: number;
}

interface ProfDevoirsClientProps {
  teacherName: string;
  classes: { id: string; name: string }[];
  lessonsWithHomework: TeacherLessonHomework[];
  upcomingLessonsWithoutHomework: TeacherLessonHomework[];
}

export default function ProfDevoirsClient({
  teacherName,
  classes,
  lessonsWithHomework: initialLessonsWithHomework,
  upcomingLessonsWithoutHomework,
}: ProfDevoirsClientProps) {
  const router = useRouter();
  const [lessonsWithHomework, setLessonsWithHomework] = useState(initialLessonsWithHomework);
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [timeFilter, setTimeFilter] = useState<"ALL" | "UPCOMING" | "PAST">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Edit / Add modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<TeacherLessonHomework | null>(null);
  const [homeworkText, setHomeworkText] = useState("");
  const [notifyStudents, setNotifyStudents] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Student stats modal state
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [togglingStudentId, setTogglingStudentId] = useState<string | null>(null);
  const [selectedLessonForStats, setSelectedLessonForStats] = useState<TeacherLessonHomework | null>(null);
  const [statsData, setStatsData] = useState<{
    totalStudents: number;
    completedCount: number;
    completionRate: number;
    completedList: { id: string; name: string; completedAt: string }[];
    pendingList: { id: string; name: string }[];
  } | null>(null);

  // New assignment selection
  const [selectedUpcomingLessonId, setSelectedUpcomingLessonId] = useState<string>("");

  const now = new Date();

  // Statistics
  const totalHomeworks = lessonsWithHomework.length;
  const upcomingHomeworksCount = lessonsWithHomework.filter(
    (l) => new Date(l.startTime.replace("Z", "")) >= now
  ).length;
  const pastHomeworksCount = totalHomeworks - upcomingHomeworksCount;

  // Filtered list
  const filteredList = useMemo(() => {
    return lessonsWithHomework.filter((item) => {
      if (selectedClass !== "ALL" && item.classId !== selectedClass) return false;

      const itemDate = new Date(item.startTime.replace("Z", ""));
      if (timeFilter === "UPCOMING" && itemDate < now) return false;
      if (timeFilter === "PAST" && itemDate >= now) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesClass = item.className.toLowerCase().includes(q);
        const matchesSubject = item.subjectName.toLowerCase().includes(q);
        const matchesContent = (item.homework || "").toLowerCase().includes(q);
        if (!matchesClass && !matchesSubject && !matchesContent) return false;
      }

      return true;
    });
  }, [lessonsWithHomework, selectedClass, timeFilter, searchQuery, now]);

  const openEditModal = (lesson: TeacherLessonHomework) => {
    setEditingLesson(lesson);
    setHomeworkText(lesson.homework || "");
    setNotifyStudents(true);
    setSelectedUpcomingLessonId(lesson.id);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openNewModal = () => {
    setEditingLesson(null);
    setHomeworkText("");
    setNotifyStudents(true);
    setErrorMsg(null);
    if (upcomingLessonsWithoutHomework.length > 0) {
      setSelectedUpcomingLessonId(upcomingLessonsWithoutHomework[0].id);
    } else {
      setSelectedUpcomingLessonId("");
    }
    setModalOpen(true);
  };

  const openStatsModal = async (lesson: TeacherLessonHomework) => {
    setSelectedLessonForStats(lesson);
    setStatsModalOpen(true);
    setStatsLoading(true);
    try {
      const data = await getLessonHomeworkStats(lesson.id);
      setStatsData(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleToggleStudentStatus = async (studentId: string) => {
    if (!selectedLessonForStats) return;
    setTogglingStudentId(studentId);
    try {
      await adminToggleStudentHomeworkDone(selectedLessonForStats.id, studentId);
      const data = await getLessonHomeworkStats(selectedLessonForStats.id);
      setStatsData(data);
      setLessonsWithHomework((prev) =>
        prev.map((l) =>
          l.id === selectedLessonForStats.id
            ? { ...l, completedCount: data.completedCount, totalStudents: data.totalStudents }
            : l
        )
      );
    } catch (err) {
      console.error("Error toggling student status:", err);
    } finally {
      setTogglingStudentId(null);
    }
  };

  const handleSaveHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    const lessonId = editingLesson ? editingLesson.id : selectedUpcomingLessonId;

    if (!lessonId) {
      setErrorMsg("Veuillez sélectionner un cours.");
      return;
    }

    if (!homeworkText.trim()) {
      setErrorMsg("Veuillez saisir le contenu du devoir.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lessonId,
          homework: homeworkText.trim(),
          notifyStudents: notifyStudents,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur lors de l'enregistrement");
      }

      setSuccessToast(
        notifyStudents
          ? "Devoir enregistré ! Les élèves ont été notifiés par notification & push."
          : "Devoir enregistré avec succès."
      );
      setTimeout(() => setSuccessToast(null), 4000);

      setModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Impossible de sauvegarder le devoir.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHomework = async (lesson: TeacherLessonHomework) => {
    if (!confirm(`Supprimer le devoir assigné à la classe ${lesson.className} ?`)) {
      return;
    }

    try {
      const res = await fetch("/api/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lesson.id,
          homework: null,
          notifyStudents: false,
        }),
      });

      if (!res.ok) throw new Error("Erreur suppression");

      setLessonsWithHomework((prev) => prev.filter((l) => l.id !== lesson.id));
      setSuccessToast("Devoir supprimé.");
      setTimeout(() => setSuccessToast(null), 3000);
      router.refresh();
    } catch {
      alert("Une erreur est survenue lors de la suppression.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col gap-6 font-sans text-slate-900 pb-16">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-bold">{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <BookMarked className="w-3.5 h-3.5" />
                Espace Enseignant
              </span>
              <span className="text-xs font-semibold text-slate-300">
                Gestion & Suivi Pédagogique
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Cahier de textes & Devoirs
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Donnez des consignes claires, planifiez vos devoirs et suivez en temps réel le taux de préparation des élèves avant le cours.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Stat */}
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 shrink-0">
              <div className="flex flex-col px-2">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                  À venir
                </span>
                <span className="text-xl font-black text-amber-300">
                  {upcomingHomeworksCount}
                </span>
              </div>
              <div className="h-7 w-[1px] bg-white/20" />
              <div className="flex flex-col px-2">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                  Total
                </span>
                <span className="text-xl font-black text-white">
                  {totalHomeworks}
                </span>
              </div>
            </div>

            {/* Action button */}
            <button
              onClick={openNewModal}
              className="flex items-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-600/30 transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Donner un devoir
            </button>
          </div>
        </div>
      </div>

      {/* Control bar: Search + Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par classe, matière ou consigne..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Class selector */}
          <div className="relative flex items-center">
            <Filter className="absolute left-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="pl-8 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition appearance-none"
            >
              <option value="ALL">Toutes les classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Time Filter */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setTimeFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg transition ${
                timeFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Tous ({totalHomeworks})
            </button>
            <button
              onClick={() => setTimeFilter("UPCOMING")}
              className={`px-3 py-1.5 rounded-lg transition ${
                timeFilter === "UPCOMING"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              À venir ({upcomingHomeworksCount})
            </button>
            <button
              onClick={() => setTimeFilter("PAST")}
              className={`px-3 py-1.5 rounded-lg transition ${
                timeFilter === "PAST"
                  ? "bg-white text-slate-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Archives ({pastHomeworksCount})
            </button>
          </div>
        </div>
      </div>

      {/* Devoirs Grid */}
      {filteredList.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
            <BookMarked className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {totalHomeworks === 0
              ? "Aucun devoir créé pour vos cours"
              : "Aucun devoir ne correspond à vos filtres"}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {totalHomeworks === 0
              ? "Cliquez sur 'Donner un devoir' pour assigner un travail ou des révisions à l'une de vos classes."
              : "Essayez de modifier votre recherche ou de changer de classe."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((item) => {
            const isUpcoming = new Date(item.startTime.replace("Z", "")) >= now;
            const dateObj = new Date(item.startTime.replace("Z", ""));
            const total = item.totalStudents || 0;
            const completed = item.completedCount || 0;
            const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top line: Class badge + Status badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                        {item.className}
                      </span>
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {item.subjectName}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isUpcoming
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {isUpcoming ? "À venir" : "Terminé"}
                    </span>
                  </div>

                  {/* Due Date */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-3">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Pour le {dateObj.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" })} à {dateObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-800 whitespace-pre-wrap break-words leading-relaxed max-h-36 overflow-y-auto custom-scrollbar">
                    {item.homework}
                  </div>

                  {/* Point 1: Statistiques de préparation de la classe */}
                  <div className="mt-3.5 p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px]">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        Préparation classe
                      </span>
                      <span className={`text-[11px] font-black ${
                        rate === 100
                          ? "text-emerald-700"
                          : rate > 0
                          ? "text-blue-700"
                          : "text-slate-500"
                      }`}>
                        {total > 0 ? `${completed}/${total} (${rate}%)` : `${completed} élève(s)`}
                      </span>
                    </div>
                    {total > 0 && (
                      <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => openStatsModal(item)}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 text-left pt-0.5"
                    >
                      {total > 0 
                        ? `Voir le détail des élèves (${completed} fait, ${Math.max(0, total - completed)} restant) →`
                        : `Voir les ${completed} élève(s) ayant réalisé le devoir →`}
                    </button>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">
                    ID #{item.id.slice(-6)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(item)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-xs font-bold transition"
                      title="Modifier le devoir"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteHomework(item)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Supprimer ce devoir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Student Homework Stats */}
      {statsModalOpen && selectedLessonForStats &&
        createPortal(
          <div className="fixed inset-0 z-[9999] overflow-y-auto custom-scrollbar flex min-h-screen items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg min-w-[320px] max-h-[85vh] my-auto shadow-2xl relative flex flex-col border border-slate-100 overflow-hidden">
              <button
                onClick={() => setStatsModalOpen(false)}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
                title="Fermer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-4 pr-8">
                <span className="text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                  Suivi de préparation • {selectedLessonForStats.className}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-2">
                  {selectedLessonForStats.subjectName}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consultez la liste des élèves ayant validé ce devoir avant la séance.
                </p>
              </div>

              {statsLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="text-xs font-medium">Chargement des données...</span>
                </div>
              ) : statsData ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-1">
                  {/* Summary Bar */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                        Taux de réalisation
                      </span>
                      <span className="text-xl font-black text-slate-900">
                        {statsData.completionRate}%
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg">
                        {statsData.completedCount} fait(s)
                      </span>
                      <span className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg">
                        {statsData.totalStudents - statsData.completedCount} restant(s)
                      </span>
                    </div>
                  </div>

                  {/* List of completed */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Élèves ayant terminé ({statsData.completedList.length})
                    </h3>
                    {statsData.completedList.length === 0 ? (
                      <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">
                        Aucun élève n&apos;a encore marqué ce devoir comme terminé.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                        {statsData.completedList.map((s) => {
                          const isThisToggling = togglingStudentId === s.id;
                          return (
                            <div
                              key={s.id}
                              className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between text-xs gap-2"
                            >
                              <div className="min-w-0">
                                <span className="font-semibold text-emerald-950 block truncate">{s.name}</span>
                                <span className="text-[10px] text-emerald-700 font-medium">
                                  Validé le {new Date(s.completedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                                </span>
                              </div>
                              <button
                                type="button"
                                disabled={isThisToggling}
                                onClick={() => handleToggleStudentStatus(s.id)}
                                className="text-[10px] font-bold text-slate-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-md transition shrink-0"
                                title="Remettre en attente"
                              >
                                {isThisToggling ? <Loader2 className="w-3 h-3 animate-spin" /> : "Décocher"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* List of pending */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" />
                      En attente ({statsData.pendingList.length})
                    </h3>
                    {statsData.pendingList.length === 0 ? (
                      <p className="text-xs text-emerald-700 font-bold p-3 bg-emerald-50 rounded-xl">
                        Tous les élèves de la classe ont validé ce devoir ! 🎉
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                        {statsData.pendingList.map((s) => {
                          const isThisToggling = togglingStudentId === s.id;
                          return (
                            <div
                              key={s.id}
                              className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs text-slate-700 gap-2"
                            >
                              <span className="truncate">{s.name}</span>
                              <button
                                type="button"
                                disabled={isThisToggling}
                                onClick={() => handleToggleStudentStatus(s.id)}
                                className="text-[10px] font-bold text-blue-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-md transition shrink-0 flex items-center gap-1"
                                title="Valider manuellement ce devoir"
                              >
                                {isThisToggling ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="w-3 h-3" />
                                    Valider
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="pt-4 border-t border-slate-100 flex justify-end mt-4 shrink-0">
                <button
                  onClick={() => setStatsModalOpen(false)}
                  className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Add or Edit Homework */}
      {modalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] overflow-y-auto custom-scrollbar flex min-h-screen items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg min-w-[320px] shadow-2xl relative flex flex-col border border-slate-100">
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
                title="Fermer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-4 pr-8">
                <span className="text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                  {editingLesson ? "Modifier" : "Nouveau Devoir"}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-2">
                  {editingLesson
                    ? `Modifier le devoir (${editingLesson.className})`
                    : "Assigner un devoir à une classe"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Les élèves recevront les consignes dans leur cahier de texte.
                </p>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveHomework} className="flex flex-col gap-4">
                {!editingLesson && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Sélectionner le cours concerné
                    </label>
                    {upcomingLessonsWithoutHomework.length === 0 ? (
                      <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                        Aucun prochain cours sans devoir n&apos;est disponible dans votre planning. Vous pouvez modifier un devoir existant depuis la liste.
                      </p>
                    ) : (
                      <select
                        value={selectedUpcomingLessonId}
                        onChange={(e) => setSelectedUpcomingLessonId(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        required
                      >
                        {upcomingLessonsWithoutHomework.map((l) => {
                          const d = new Date(l.startTime.replace("Z", ""));
                          return (
                            <option key={l.id} value={l.id}>
                              {l.className} • {l.subjectName} — {d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} à {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Consigne / Travail à faire
                  </label>
                  <textarea
                    rows={6}
                    value={homeworkText}
                    onChange={(e) => setHomeworkText(e.target.value)}
                    placeholder="Ex: Exercices 3 et 4 page 52. Réviser le chapitre 2 pour le prochain cours..."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition custom-scrollbar"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Saisissez des consignes claires et structurées. Pas de dépôt de fichier nécessaire.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="profNotifyStudents"
                    checked={notifyStudents}
                    onChange={(e) => setNotifyStudents(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <label
                    htmlFor="profNotifyStudents"
                    className="text-xs font-semibold text-slate-800 cursor-pointer select-none"
                  >
                    Notifier immédiatement tous les élèves de la classe
                    <span className="block text-[11px] font-normal text-slate-500 mt-0.5">
                      Envoie une notification in-app et une notification push mobile aux élèves.
                    </span>
                  </label>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (!editingLesson && !selectedUpcomingLessonId)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/20 transition"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Enregistrer le devoir
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
