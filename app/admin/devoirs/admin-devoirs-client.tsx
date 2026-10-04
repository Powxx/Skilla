"use client";

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  BookMarked,
  Calendar,
  Clock,
  Search,
  Filter,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  User,
  GraduationCap,
  Sparkles,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Loader2,
  Check,
} from "lucide-react";
import { getLessonHomeworkStats, adminToggleStudentHomeworkDone } from "@/app/actions/homework";

export interface AdminHomeworkLesson {
  id: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  classId: string;
  className: string;
  subjectId: string | null;
  subjectName: string;
  teacherId: string | null;
  teacherName: string;
  homework: string;
  summary: string | null;
  totalStudents: number;
  completedCount: number;
}

interface AdminDevoirsClientProps {
  lessons: AdminHomeworkLesson[];
  classes: { id: string; name: string }[];
  teachers: { id: string; name: string }[];
}

export default function AdminDevoirsClient({
  lessons: initialLessons,
  classes,
  teachers,
}: AdminDevoirsClientProps) {
  const [lessons, setLessons] = useState<AdminHomeworkLesson[]>(initialLessons);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("ALL");
  const [timeFilter, setTimeFilter] = useState<"ALL" | "UPCOMING" | "PAST">("ALL");

  // Inspection modal state
  const [inspectedLesson, setInspectedLesson] = useState<AdminHomeworkLesson | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [togglingStudentId, setTogglingStudentId] = useState<string | null>(null);
  const [statsData, setStatsData] = useState<{
    totalStudents: number;
    completedCount: number;
    completionRate: number;
    completedList: { id: string; name: string; completedAt: string }[];
    pendingList: { id: string; name: string }[];
  } | null>(null);

  const now = new Date();

  const handleToggleStudentStatus = async (studentId: string) => {
    if (!inspectedLesson) return;
    setTogglingStudentId(studentId);
    try {
      await adminToggleStudentHomeworkDone(inspectedLesson.id, studentId);
      const updated = await getLessonHomeworkStats(inspectedLesson.id);
      setStatsData(updated);
      setLessons((prev) =>
        prev.map((l) =>
          l.id === inspectedLesson.id
            ? { ...l, completedCount: updated.completedCount, totalStudents: updated.totalStudents }
            : l
        )
      );
    } catch (err) {
      console.error("Error toggling student status:", err);
    } finally {
      setTogglingStudentId(null);
    }
  };

  // Global KPIs
  const totalHomeworks = lessons.length;
  const upcomingHomeworks = lessons.filter(
    (l) => new Date(l.startTime.replace("Z", "")) >= now
  );
  const pastHomeworks = lessons.filter(
    (l) => new Date(l.startTime.replace("Z", "")) < now
  );

  const totalAssignedSlots = lessons.reduce((acc, curr) => acc + (curr.totalStudents || 0), 0);
  const totalCompletedSlots = lessons.reduce((acc, curr) => acc + (curr.completedCount || 0), 0);
  const globalCompletionRate =
    totalAssignedSlots > 0
      ? Math.round((totalCompletedSlots / totalAssignedSlots) * 100)
      : 0;

  // Filtered lessons
  const filteredLessons = useMemo(() => {
    return lessons.filter((item) => {
      if (selectedClass !== "ALL" && item.classId !== selectedClass) return false;
      if (selectedTeacher !== "ALL" && item.teacherId !== selectedTeacher) return false;

      const itemDate = new Date(item.startTime.replace("Z", ""));
      if (timeFilter === "UPCOMING" && itemDate < now) return false;
      if (timeFilter === "PAST" && itemDate >= now) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesClass = item.className.toLowerCase().includes(q);
        const matchesSubject = item.subjectName.toLowerCase().includes(q);
        const matchesTeacher = item.teacherName.toLowerCase().includes(q);
        const matchesContent = item.homework.toLowerCase().includes(q);
        if (!matchesClass && !matchesSubject && !matchesTeacher && !matchesContent) {
          return false;
        }
      }

      return true;
    });
  }, [lessons, selectedClass, selectedTeacher, timeFilter, searchQuery, now]);

  const handleOpenStats = async (lesson: AdminHomeworkLesson) => {
    setInspectedLesson(lesson);
    setStatsLoading(true);
    setStatsData(null);
    try {
      const data = await getLessonHomeworkStats(lesson.id);
      setStatsData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <BookMarked className="h-4 w-4" />
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-blue-600">
              Supervision Scolaire
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Centralisation des Devoirs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Suivi en temps réel de tous les travaux donnés par les professeurs et avancement des élèves
          </p>
        </div>

        <Link
          href="/admin"
          className="self-start md:self-auto px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-sm"
        >
          ← Retour au Hub Admin
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <BookMarked className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{totalHomeworks}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">
              Devoirs donnés
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-amber-600">{upcomingHomeworks.length}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">
              À venir / En cours
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800">{pastHomeworks.length}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">
              Passés / Archivés
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-600">{globalCompletionRate}%</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">
              Complétion globale
            </p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par matière, classe, prof ou consigne..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
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

        {/* Dropdowns & tabs */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Class filter */}
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

          {/* Teacher filter */}
          <div className="relative flex items-center">
            <User className="absolute left-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="pl-8 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition appearance-none"
            >
              <option value="ALL">Tous les professeurs</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
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
              À venir ({upcomingHomeworks.length})
            </button>
            <button
              onClick={() => setTimeFilter("PAST")}
              className={`px-3 py-1.5 rounded-lg transition ${
                timeFilter === "PAST"
                  ? "bg-white text-slate-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Archives ({pastHomeworks.length})
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Homeworks */}
      {filteredLessons.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
            <BookMarked className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {totalHomeworks === 0
              ? "Aucun devoir enregistré dans l'établissement"
              : "Aucun devoir ne correspond à vos filtres"}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {totalHomeworks === 0
              ? "Les devoirs attribués par les enseignants s'afficheront ici automatiquement."
              : "Essayez de modifier votre recherche ou de réinitialiser les filtres."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredLessons.map((item) => {
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
                  {/* Top tags */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                        {item.className}
                      </span>
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {item.subjectName}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        isUpcoming
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {isUpcoming ? "À venir" : "Passé"}
                    </span>
                  </div>

                  {/* Teacher & Date */}
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <span>{item.teacherName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Échéance : {dateObj.toLocaleDateString("fr-FR", {
                          weekday: "short",
                          day: "numeric",
                          month: "long",
                        })}{" "}
                        à{" "}
                        {dateObj.toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Content box */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-800 whitespace-pre-wrap break-words leading-relaxed max-h-36 overflow-y-auto custom-scrollbar">
                    {item.homework}
                  </div>

                  {/* Preparation Stats */}
                  <div className="mt-3.5 p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px]">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        Réalisation élèves
                      </span>
                      <span
                        className={`text-[11px] font-black ${
                          rate === 100
                            ? "text-emerald-700"
                            : rate > 0
                            ? "text-blue-700"
                            : "text-slate-500"
                        }`}
                      >
                        {total > 0
                          ? `${completed}/${total} (${rate}%)`
                          : `${completed} élève(s)`}
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
                      onClick={() => handleOpenStats(item)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 text-left pt-0.5 hover:underline"
                    >
                      {total > 0
                        ? `Voir le détail des élèves (${completed} fait, ${Math.max(
                            0,
                            total - completed
                          )} en attente) →`
                        : `Voir les ${completed} élève(s) ayant fait le devoir →`}
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>ID cours : #{item.id.slice(-6)}</span>
                  <button
                    onClick={() => handleOpenStats(item)}
                    className="flex items-center gap-1 font-bold text-slate-600 hover:text-blue-600 transition"
                  >
                    Inspecter la classe
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Student inspection */}
      {inspectedLesson &&
        createPortal(
          <div className="fixed inset-0 z-[9999] overflow-y-auto custom-scrollbar flex min-h-screen items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-xl min-w-[320px] max-h-[85vh] my-auto shadow-2xl relative flex flex-col border border-slate-100 overflow-hidden">
              <button
                onClick={() => setInspectedLesson(null)}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
                title="Fermer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-4 pr-8">
                <span className="text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                  {inspectedLesson.className} • {inspectedLesson.subjectName}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-2">
                  Détail de réalisation des devoirs
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enseignant : <span className="font-semibold text-slate-700">{inspectedLesson.teacherName}</span>
                </p>
              </div>

              {/* Consigne reminder */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl mb-4 text-xs text-slate-700 max-h-24 overflow-y-auto custom-scrollbar">
                <span className="font-bold text-slate-900 block mb-1">Travail demandé :</span>
                {inspectedLesson.homework}
              </div>

              {statsLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <p className="text-xs font-bold text-slate-500">
                    Chargement des émargements élèves...
                  </p>
                </div>
              ) : statsData ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-5">
                  {/* Progress summary bar */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/80 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-600">Avancement classe</span>
                      <p className="text-xl font-black text-blue-900">
                        {statsData.completedCount} / {statsData.totalStudents} élèves
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-600">Taux de réalisation</span>
                      <p className="text-xl font-black text-emerald-600">
                        {statsData.completionRate}%
                      </p>
                    </div>
                  </div>

                  {/* Two column list */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Done list */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                        <span className="text-xs font-black text-emerald-700 flex items-center gap-1.5 uppercase tracking-wider">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Fait ({statsData.completedList.length})
                        </span>
                      </div>
                      {statsData.completedList.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-3">
                          Aucun élève n&apos;a encore marqué ce devoir comme fait.
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                          {statsData.completedList.map((st) => {
                            const date = new Date(st.completedAt);
                            const isThisToggling = togglingStudentId === st.id;
                            return (
                              <div
                                key={st.id}
                                className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between text-xs gap-2"
                              >
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-800 block truncate">{st.name}</span>
                                  <span className="text-[10px] text-emerald-700 font-medium">
                                    {date.toLocaleDateString("fr-FR", {
                                      day: "numeric",
                                      month: "short",
                                    })}{" "}
                                    {date.toLocaleTimeString("fr-FR", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  disabled={isThisToggling}
                                  onClick={() => handleToggleStudentStatus(st.id)}
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

                    {/* Pending list */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                        <span className="text-xs font-black text-amber-700 flex items-center gap-1.5 uppercase tracking-wider">
                          <AlertCircle className="w-3.5 h-3.5" />
                          En attente ({statsData.pendingList.length})
                        </span>
                      </div>
                      {statsData.pendingList.length === 0 ? (
                        <p className="text-xs text-emerald-600 font-bold py-3 flex items-center gap-1">
                          <Check className="w-4 h-4" /> Toute la classe a terminé !
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                          {statsData.pendingList.map((st) => {
                            const isThisToggling = togglingStudentId === st.id;
                            return (
                              <div
                                key={st.id}
                                className="p-2.5 rounded-xl bg-amber-50/40 border border-amber-100/80 text-xs font-semibold text-slate-700 flex items-center justify-between gap-2"
                              >
                                <span className="truncate">{st.name}</span>
                                <button
                                  type="button"
                                  disabled={isThisToggling}
                                  onClick={() => handleToggleStudentStatus(st.id)}
                                  className="text-[10px] font-bold text-blue-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-md transition shrink-0 flex items-center gap-1"
                                  title="Valider ce devoir manuellement"
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
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  Impossible de charger les statistiques pour ce cours.
                </div>
              )}

              <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setInspectedLesson(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
