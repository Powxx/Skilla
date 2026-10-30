"use client";

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  BookMarked,
  BookOpen,
  Calendar,
  Clock,
  Search,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  User,
  ArrowRight,
  TrendingUp,
  Loader2,
  Check,
  Building2,
  FileText,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getLessonHomeworkStats, adminToggleStudentHomeworkDone } from "@/app/actions/homework";

export interface AdminCourseLesson {
  id: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  classId: string;
  className: string;
  subjectId: string | null;
  subjectName: string;
  teacherId: string | null;
  teacherName: string;
  roomId: string | null;
  roomName: string | null;
  homework: string | null;
  summary: string | null;
  hasHomework: boolean;
  hasSummary: boolean;
  totalStudents: number;
  completedCount: number;
}

export type AdminHomeworkLesson = AdminCourseLesson;

type ContentTab = "ALL" | "SUMMARY" | "HOMEWORK" | "MISSING";

interface AdminDevoirsClientProps {
  lessons: AdminCourseLesson[];
  classes: { id: string; name: string }[];
  teachers: { id: string; name: string }[];
  initialTab?: ContentTab;
  initialClassId?: string;
  initialSubjectId?: string;
  initialTeacherId?: string;
}

export default function AdminDevoirsClient({
  lessons: initialLessons,
  classes,
  teachers,
  initialTab = "HOMEWORK",
  initialClassId = "ALL",
  initialSubjectId = "ALL",
  initialTeacherId = "ALL",
}: AdminDevoirsClientProps) {
  const [lessons, setLessons] = useState<AdminCourseLesson[]>(initialLessons);
  const [activeTab, setActiveTab] = useState<ContentTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>(initialClassId);
  const [selectedTeacher, setSelectedTeacher] = useState<string>(initialTeacherId);
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubjectId);
  const [timeFilter, setTimeFilter] = useState<"ALL" | "UPCOMING" | "PAST">("ALL");
  const [expandedSummaries, setExpandedSummaries] = useState<Record<string, boolean>>({});

  // Inspection modal state
  const [inspectedLesson, setInspectedLesson] = useState<AdminCourseLesson | null>(null);
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

  const toggleSummaryExpand = (id: string) => {
    setExpandedSummaries((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Global Metrics
  const totalLessons = lessons.length;
  const lessonsWithSummary = lessons.filter((l) => l.hasSummary).length;
  const lessonsWithHomework = lessons.filter((l) => l.hasHomework).length;
  const pastLessons = lessons.filter((l) => new Date(l.startTime) < now);
  const pastWithoutContent = pastLessons.filter((l) => !l.hasSummary && !l.hasHomework).length;

  const summaryFillRate = pastLessons.length > 0
    ? Math.round((pastLessons.filter((l) => l.hasSummary).length / pastLessons.length) * 100)
    : (lessonsWithSummary > 0 ? Math.round((lessonsWithSummary / totalLessons) * 100) : 0);

  const totalAssignedSlots = lessons.reduce((acc, curr) => acc + (curr.hasHomework ? (curr.totalStudents || 0) : 0), 0);
  const totalCompletedSlots = lessons.reduce((acc, curr) => acc + (curr.hasHomework ? (curr.completedCount || 0) : 0), 0);
  const globalCompletionRate =
    totalAssignedSlots > 0
      ? Math.round((totalCompletedSlots / totalAssignedSlots) * 100)
      : 0;

  // Unique subjects derived from lessons
  const subjects = useMemo(() => {
    const map = new Map<string, string>();
    lessons.forEach((l) => {
      if (l.subjectId && l.subjectName) {
        map.set(l.subjectId, l.subjectName);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [lessons]);

  // Filtered lessons
  const filteredLessons = useMemo(() => {
    return lessons.filter((item) => {
      if (selectedClass !== "ALL" && item.classId !== selectedClass) return false;
      if (selectedTeacher !== "ALL" && item.teacherId !== selectedTeacher) return false;
      if (selectedSubject !== "ALL" && item.subjectId !== selectedSubject) return false;

      const itemDate = new Date(item.startTime);
      const isPast = itemDate < now;

      if (timeFilter === "UPCOMING" && isPast) return false;
      if (timeFilter === "PAST" && !isPast) return false;

      // Tab filtering
      if (activeTab === "HOMEWORK" && !item.hasHomework) return false;
      if (activeTab === "SUMMARY" && !item.hasSummary) return false;
      if (activeTab === "MISSING" && (!isPast || (item.hasSummary || item.hasHomework))) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesClass = item.className.toLowerCase().includes(q);
        const matchesSubject = item.subjectName.toLowerCase().includes(q);
        const matchesTeacher = item.teacherName.toLowerCase().includes(q);
        const matchesRoom = (item.roomName || "").toLowerCase().includes(q);
        const matchesHomework = (item.homework || "").toLowerCase().includes(q);
        const matchesSummary = (item.summary || "").toLowerCase().includes(q);

        if (
          !matchesClass &&
          !matchesSubject &&
          !matchesTeacher &&
          !matchesRoom &&
          !matchesHomework &&
          !matchesSummary
        ) {
          return false;
        }
      }

      return true;
    });
  }, [lessons, selectedClass, selectedTeacher, timeFilter, activeTab, searchQuery, now]);

  const handleOpenStats = async (lesson: AdminCourseLesson) => {
    setInspectedLesson(lesson);
    setStatsLoading(true);
    setStatsData(null);
    try {
      if (lesson.hasHomework) {
        const data = await getLessonHomeworkStats(lesson.id);
        setStatsData(data);
      }
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
              Devoirs & Pédagogie
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Supervision des Devoirs & Cahier de Texte
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Suivez en priorité les devoirs et travaux assignés aux classes ainsi que les contenus des cours
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-sm"
          >
            ← Tour de Contrôle
          </Link>
          <Link
            href="/admin"
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-sm"
          >
            Hub Admin
          </Link>
        </div>
      </div>

      {/* KPI Cards (Devoirs d'abord) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <BookMarked className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-blue-600">{lessonsWithHomework}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">
              Devoirs assignés
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-violet-600">{globalCompletionRate}%</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">
              Rendu devoirs élèves
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl font-black text-emerald-600">{summaryFillRate}%</p>
              <span className="text-xs font-bold text-slate-400">({lessonsWithSummary})</span>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">
              Cahier de texte rempli
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{totalLessons}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">
              Total séances
            </p>
          </div>
        </div>
      </div>

      {/* Tabs navigation (Devoirs en premier) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab("HOMEWORK")}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 ${
            activeTab === "HOMEWORK"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white text-blue-700 hover:bg-blue-50 border border-blue-200"
          }`}
        >
          <BookMarked className="h-3.5 w-3.5" />
          Devoirs ({lessonsWithHomework})
        </button>
        <button
          onClick={() => setActiveTab("SUMMARY")}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 ${
            activeTab === "SUMMARY"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Cahier de texte ({lessonsWithSummary})
        </button>
        <button
          onClick={() => setActiveTab("ALL")}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
            activeTab === "ALL"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          Tous les cours ({totalLessons})
        </button>
        <button
          onClick={() => setActiveTab("MISSING")}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 ${
            activeTab === "MISSING"
              ? "bg-amber-600 text-white shadow-sm"
              : "bg-white text-amber-700 hover:bg-amber-50 border border-amber-200"
          }`}
        >
          <AlertCircle className="h-3.5 w-3.5" />
          Non renseignés ({pastWithoutContent})
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par matière, classe, prof, salle ou consigne..."
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

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Class select */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Toutes les classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Teacher select */}
          <select
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Tous les formateurs</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Subject select */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Toutes les matières</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Time filter */}
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Toutes dates</option>
            <option value="UPCOMING">À venir</option>
            <option value="PAST">Passés</option>
          </select>

          {/* Reset Filters button if active */}
          {(selectedClass !== "ALL" || selectedSubject !== "ALL" || selectedTeacher !== "ALL" || timeFilter !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                setSelectedClass("ALL");
                setSelectedSubject("ALL");
                setSelectedTeacher("ALL");
                setTimeFilter("ALL");
                setSearchQuery("");
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1"
              title="Réinitialiser tous les filtres"
            >
              <X className="h-3.5 w-3.5" />
              Effacer filtres
            </button>
          )}
        </div>
      </div>

      {/* Course & Homework List */}
      {filteredLessons.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
          <div className="h-16 w-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-8 w-8" />
          </div>
          <h3 className="text-base font-black text-slate-800">Aucune séance trouvée</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Aucun cours ne correspond aux filtres appliqués. Essayez d&apos;élargir vos critères de recherche.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredLessons.map((item) => {
            const startDate = new Date(item.startTime.replace("Z", ""));
            const endDate = new Date(item.endTime.replace("Z", ""));
            const isPast = startDate < now;
            const isExpanded = Boolean(expandedSummaries[item.id]);

            const completed = item.completedCount || 0;
            const total = item.totalStudents || 0;
            const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Header: Class & Status Badges */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                        {item.className}
                      </span>
                      {item.roomName && (
                        <span className="px-2 py-1 rounded-xl text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {item.roomName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.hasSummary ? (
                        <span
                          title="Cahier de texte saisi"
                          className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Contenu ✓
                        </span>
                      ) : isPast ? (
                        <span
                          title="Cahier de texte non renseigné"
                          className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"
                        >
                          <AlertCircle className="w-3 h-3" />
                          À saisir
                        </span>
                      ) : null}

                      {item.hasHomework && (
                        <span
                          title="Devoir consigné"
                          className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1"
                        >
                          <BookMarked className="w-3 h-3" />
                          Devoir
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Subject Title */}
                  <h3 className="text-base font-black text-slate-900 leading-snug mb-2">
                    {item.subjectName}
                  </h3>

                  {/* Teacher & Schedule info */}
                  <div className="space-y-1 mb-4 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-slate-700">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <span>{item.teacherName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {startDate.toLocaleDateString("fr-FR", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        • {startDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} -{" "}
                        {endDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  {/* Homework Block (Devoirs d'abord) */}
                  {item.hasHomework ? (
                    <div className="mb-3.5 p-3 rounded-2xl bg-blue-50/60 border border-blue-100 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-blue-900 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                          <BookMarked className="w-3.5 h-3.5 text-blue-600" />
                          Devoir à faire
                        </span>
                        <span
                          className={`text-[10px] font-black ${
                            rate === 100
                              ? "text-emerald-700"
                              : rate > 0
                              ? "text-blue-700"
                              : "text-slate-500"
                          }`}
                        >
                          {total > 0 ? `${completed}/${total} (${rate}%)` : `${completed} élève(s)`}
                        </span>
                      </div>

                      <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed line-clamp-2">
                        {item.homework}
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
                        Détail des élèves ({completed} fait, {Math.max(0, total - completed)} en attente) →
                      </button>
                    </div>
                  ) : (
                    <div className="mb-3.5 p-2.5 rounded-xl border border-dashed border-slate-200 text-center text-[10px] text-slate-400 font-medium">
                      Aucun devoir assigné pour ce cours
                    </div>
                  )}

                  {/* Course Content / Cahier de texte block */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1.5">
                      <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-emerald-700">
                        <BookOpen className="w-3.5 h-3.5" />
                        Cahier de texte
                      </span>
                      {item.summary && item.summary.length > 120 && (
                        <button
                          type="button"
                          onClick={() => toggleSummaryExpand(item.id)}
                          className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                        >
                          {isExpanded ? (
                            <>
                              Réduire <ChevronUp className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              Lire plus <ChevronDown className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {item.summary ? (
                      <p
                        className={`text-xs text-slate-800 whitespace-pre-wrap leading-relaxed ${
                          isExpanded ? "" : "line-clamp-3"
                        }`}
                      >
                        {item.summary}
                      </p>
                    ) : (
                      <p className="text-[11px] italic text-slate-400">
                        {isPast
                          ? "⚠️ Aucun contenu consigné pour cette séance."
                          : "Contenu à renseigner après la tenue du cours."}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>ID : #{item.id.slice(-6)}</span>
                  <button
                    onClick={() => handleOpenStats(item)}
                    className="flex items-center gap-1 font-bold text-slate-700 hover:text-blue-600 transition"
                  >
                    Inspecter la séance
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Inspection of Course Session & Student Homework */}
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
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                    {inspectedLesson.className}
                  </span>
                  {inspectedLesson.roomName && (
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                      Salle : {inspectedLesson.roomName}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-black text-slate-900">
                  {inspectedLesson.subjectName}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Formateur : <span className="font-semibold text-slate-700">{inspectedLesson.teacherName}</span>
                </p>
              </div>

              {/* Course summary preview */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl mb-4 text-xs text-slate-700 max-h-36 overflow-y-auto custom-scrollbar">
                <span className="font-black text-slate-900 block mb-1 uppercase tracking-wider text-[10px] text-emerald-700 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  Contenu du cours (Cahier de texte)
                </span>
                {inspectedLesson.summary ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{inspectedLesson.summary}</p>
                ) : (
                  <span className="text-slate-400 italic">Aucun résumé de cours consigné.</span>
                )}
              </div>

              {/* Homework section if any */}
              {inspectedLesson.hasHomework && (
                <div className="p-3.5 bg-blue-50/40 border border-blue-100 rounded-2xl mb-4 text-xs text-slate-700 max-h-28 overflow-y-auto custom-scrollbar">
                  <span className="font-black text-blue-900 block mb-1 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <BookMarked className="w-3.5 h-3.5 text-blue-600" />
                    Travail demandé aux élèves
                  </span>
                  <p className="whitespace-pre-wrap leading-relaxed">{inspectedLesson.homework}</p>
                </div>
              )}

              {/* Student status checklist if homework exists */}
              {inspectedLesson.hasHomework && (
                statsLoading ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
                    <p className="text-xs font-bold text-slate-500">
                      Chargement des émargements élèves...
                    </p>
                  </div>
                ) : statsData ? (
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Avancement</span>
                        <p className="text-lg font-black text-blue-900">
                          {statsData.completedCount} / {statsData.totalStudents} élèves
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Complétion</span>
                        <p className="text-lg font-black text-emerald-600">
                          {statsData.completionRate}%
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Completed list */}
                      <div className="space-y-2">
                        <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5 uppercase tracking-wider">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Terminé ({statsData.completedList.length})
                        </span>
                        {statsData.completedList.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-2">Aucun pour le moment</p>
                        ) : (
                          <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                            {statsData.completedList.map((st) => (
                              <div
                                key={st.id}
                                className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between text-xs"
                              >
                                <span className="font-bold text-slate-800 truncate">{st.name}</span>
                                <button
                                  type="button"
                                  disabled={togglingStudentId === st.id}
                                  onClick={() => handleToggleStudentStatus(st.id)}
                                  className="text-[10px] font-bold text-slate-400 hover:text-red-600 px-1.5 py-0.5 rounded transition"
                                >
                                  {togglingStudentId === st.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Décocher"}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Pending list */}
                      <div className="space-y-2">
                        <span className="text-xs font-black text-amber-800 flex items-center gap-1.5 uppercase tracking-wider">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          En attente ({statsData.pendingList.length})
                        </span>
                        {statsData.pendingList.length === 0 ? (
                          <p className="text-xs text-emerald-600 font-bold py-2">Toute la classe a fini !</p>
                        ) : (
                          <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                            {statsData.pendingList.map((st) => (
                              <div
                                key={st.id}
                                className="p-2 rounded-xl bg-amber-50/40 border border-amber-100 text-xs flex items-center justify-between"
                              >
                                <span className="truncate text-slate-700 font-semibold">{st.name}</span>
                                <button
                                  type="button"
                                  disabled={togglingStudentId === st.id}
                                  onClick={() => handleToggleStudentStatus(st.id)}
                                  className="text-[10px] font-bold text-blue-600 hover:text-emerald-700 px-1.5 py-0.5 rounded transition flex items-center gap-1"
                                >
                                  {togglingStudentId === st.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Valider"}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null
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
