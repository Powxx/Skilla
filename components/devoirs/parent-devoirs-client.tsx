"use client";

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  BookMarked,
  Calendar,
  Search,
  Filter,
  User,
  ArrowRight,
  X,
  Sparkles,
  Info
} from "lucide-react";
import { HomeworkItem } from "@/app/student/devoirs/devoirs-client";

interface ParentDevoirsClientProps {
  studentName: string;
  className: string;
  homeworks: HomeworkItem[];
  subjects: { id: string; name: string }[];
  variant?: "parent" | "employer";
}

export default function ParentDevoirsClient({
  studentName,
  className,
  homeworks,
  subjects,
  variant = "parent",
}: ParentDevoirsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
  const [timeFilter, setTimeFilter] = useState<"ALL" | "UPCOMING" | "PAST">("ALL");
  const [selectedHw, setSelectedHw] = useState<HomeworkItem | null>(null);

  const now = new Date();

  // Statistics
  const totalCount = homeworks.length;
  const upcomingCount = homeworks.filter(
    (h) => new Date(h.date.replace("Z", "")) >= now
  ).length;

  const filteredHomeworks = useMemo(() => {
    return homeworks.filter((hw) => {
      const hwDate = new Date(hw.date.replace("Z", ""));
      if (timeFilter === "UPCOMING" && hwDate < now) return false;
      if (timeFilter === "PAST" && hwDate >= now) return false;

      if (selectedSubject !== "ALL") {
        if (hw.subjectId) {
          if (hw.subjectId !== selectedSubject) return false;
        } else {
          if (hw.subjectName !== selectedSubject) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSubject = hw.subjectName.toLowerCase().includes(q);
        const matchesContent = hw.content.toLowerCase().includes(q);
        const matchesTeacher = hw.teacherName.toLowerCase().includes(q);
        if (!matchesSubject && !matchesContent && !matchesTeacher) return false;
      }

      return true;
    });
  }, [homeworks, timeFilter, selectedSubject, searchQuery, now]);

  const formatDateLabel = (isoDate: string) => {
    try {
      const date = new Date(isoDate.replace("Z", ""));
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const target = new Date(date);
      target.setHours(0, 0, 0, 0);

      const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return {
          label: "Aujourd'hui",
          badge: "bg-amber-100 text-amber-800 border-amber-200",
          fullDate: date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
        };
      }
      if (diffDays === 1) {
        return {
          label: "Demain",
          badge: "bg-blue-100 text-blue-800 border-blue-200",
          fullDate: date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
        };
      }
      if (diffDays < 0) {
        return {
          label: `Passé (${Math.abs(diffDays)} j)`,
          badge: "bg-slate-100 text-slate-600 border-slate-200",
          fullDate: date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
        };
      }

      return {
        label: `Dans ${diffDays} j`,
        badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
        fullDate: date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
      };
    } catch {
      return {
        label: "Date",
        badge: "bg-slate-100 text-slate-600 border-slate-200",
        fullDate: isoDate,
      };
    }
  };

  return (
    <div className="min-h-screen flex flex-col gap-6 font-sans text-slate-900 pb-16">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <BookMarked className="w-3.5 h-3.5" />
                {variant === "employer" ? "Suivi Alternant" : "Espace Famille"}
              </span>
              <span className="text-xs font-semibold text-slate-300">
                {className}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Cahier de textes de {studentName}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Consultez le travail à faire, les lectures recommandées et les révisions assignées par l&apos;équipe pédagogique.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 shrink-0">
            <div className="flex flex-col items-center px-2">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                À venir
              </span>
              <span className="text-2xl font-black text-amber-300">
                {upcomingCount}
              </span>
            </div>
            <div className="h-8 w-[1px] bg-white/20" />
            <div className="flex flex-col items-center px-2">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                Total
              </span>
              <span className="text-2xl font-black text-white">
                {totalCount}
              </span>
            </div>
          </div>
        </div>

        {/* Read-only reminder pill */}
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-slate-300">
          <Info className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            Vue de consultation en lecture seule synchronisée avec le compte de l&apos;élève.
          </span>
        </div>
      </div>

      {/* Control bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par matière, consigne ou enseignant..."
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

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Subject Filter */}
          <div className="relative flex items-center">
            <Filter className="absolute left-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="pl-8 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition appearance-none"
            >
              <option value="ALL">Toutes les matières</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
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
              Tous ({totalCount})
            </button>
            <button
              onClick={() => setTimeFilter("UPCOMING")}
              className={`px-3 py-1.5 rounded-lg transition ${
                timeFilter === "UPCOMING"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              À venir ({upcomingCount})
            </button>
            <button
              onClick={() => setTimeFilter("PAST")}
              className={`px-3 py-1.5 rounded-lg transition ${
                timeFilter === "PAST"
                  ? "bg-white text-slate-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Passés ({totalCount - upcomingCount})
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      {filteredHomeworks.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {totalCount === 0
              ? "Aucun devoir enregistré pour le moment"
              : "Aucun résultat pour cette recherche"}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {totalCount === 0
              ? "Les travaux et devoirs assignés à la classe apparaîtront ici."
              : "Modifiez vos filtres pour afficher plus de résultats."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHomeworks.map((hw) => {
            const dateInfo = formatDateLabel(hw.date);

            return (
              <div
                key={hw.id}
                onClick={() => setSelectedHw(hw)}
                className="group relative flex flex-col justify-between p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                        {hw.subjectName}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${dateInfo.badge}`}
                      >
                        {dateInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 mb-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Pour le {dateInfo.fullDate}</span>
                    </div>
                    {hw.teacherName && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <User className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{hw.teacherName}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words line-clamp-4">
                    {hw.content}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                  <span className="text-[11px] uppercase tracking-wider">
                    Voir les détails
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Full Homework View */}
      {selectedHw &&
        createPortal(
          <div className="fixed inset-0 z-[9999] overflow-y-auto custom-scrollbar flex min-h-screen items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-xl min-w-[320px] max-h-[90vh] my-auto shadow-2xl relative flex flex-col overflow-hidden border border-slate-100">
              <button
                onClick={() => setSelectedHw(null)}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
                title="Fermer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="pr-10 mb-4 shrink-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                    {selectedHw.subjectName}
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${formatDateLabel(selectedHw.date).badge}`}>
                    {formatDateLabel(selectedHw.date).label}
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900">
                  Consigne du devoir
                </h2>
                <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-2 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    À rendre pour le : {new Date(selectedHw.date.replace("Z", "")).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  {selectedHw.teacherName && (
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      Enseignant : {selectedHw.teacherName}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar my-2 p-5 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-800 whitespace-pre-wrap break-words leading-relaxed select-text min-h-[140px]">
                {selectedHw.content}
              </div>

              {selectedHw.summary && (
                <div className="mt-3 p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-slate-700">
                  <span className="font-bold text-blue-900 block mb-1">
                    Résumé du cours associé :
                  </span>
                  <p className="whitespace-pre-wrap break-words text-slate-600">
                    {selectedHw.summary}
                  </p>
                </div>
              )}

              <div className="pt-4 mt-3 border-t border-slate-100 flex justify-end shrink-0">
                <button
                  onClick={() => setSelectedHw(null)}
                  className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition"
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
