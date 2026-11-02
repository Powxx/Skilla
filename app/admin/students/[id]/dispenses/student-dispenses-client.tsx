"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  Sparkles,
  ArrowLeft,
  Loader2,
  Edit3,
  Check,
  X,
  GraduationCap,
  Mail,
  Phone,
  LayoutGrid,
  Filter,
  AlertTriangle,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import {
  setDispensation,
  updateDispensationReason,
  setBulkDispensations,
} from "@/app/admin/students/actions";

export interface StudentDispensationData {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  class: {
    id: string;
    name: string;
  } | null;
  dispensations: {
    id: string;
    subjectId: string;
    reason: string | null;
    createdAt?: Date | string;
  }[];
}

export interface SubjectItem {
  id: string;
  name: string;
  isClassSubject: boolean;
}

interface StudentDispensesClientProps {
  student: StudentDispensationData;
  subjects: SubjectItem[];
}

const COMMON_REASONS = [
  "Certificat médical d'inaptitude",
  "Validation des Acquis de l'Expérience (VAE)",
  "Épreuve déjà validée / Relevé de notes antérieur",
  "Aménagement de parcours (PAI / PPS / PAP)",
  "Dispense d'épreuve officielle (Règlement d'examen)",
  "Activité professionnelle équivalente (Alternance)",
];

export default function StudentDispensesClient({
  student,
  subjects,
}: StudentDispensesClientProps) {
  // Map local des dispenses: subjectId -> { isDispensed, reason }
  const [dispensationMap, setDispensationMap] = useState<
    Record<string, { isDispensed: boolean; reason: string | null }>
  >(() => {
    const map: Record<string, { isDispensed: boolean; reason: string | null }> = {};
    for (const sub of subjects) {
      const existing = student.dispensations.find((d) => d.subjectId === sub.id);
      map[sub.id] = {
        isDispensed: !!existing,
        reason: existing?.reason || null,
      };
    }
    return map;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "DISPENSED" | "ACTIVE" | "CLASS_ONLY">("ALL");

  // État de chargement par matière ou global
  const [loadingSubjectId, setLoadingSubjectId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Toast feedback
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Modale édition de motif
  const [editingModal, setEditingModal] = useState<{
    subjectId: string;
    subjectName: string;
    currentReason: string;
  } | null>(null);

  // Modale confirmation bulk
  const [bulkModal, setBulkModal] = useState<"DISPENSE_ALL" | "ACTIVATE_ALL" | null>(null);
  const [bulkReason, setBulkReason] = useState("");

  // Calcul des statistiques
  const stats = useMemo(() => {
    const total = subjects.length;
    let dispensedCount = 0;
    let classSubjectCount = 0;
    let classDispensedCount = 0;

    for (const sub of subjects) {
      const isDisp = dispensationMap[sub.id]?.isDispensed;
      if (isDisp) dispensedCount++;
      if (sub.isClassSubject) {
        classSubjectCount++;
        if (isDisp) classDispensedCount++;
      }
    }

    const activeCount = total - dispensedCount;
    const percentDispensed = total > 0 ? Math.round((dispensedCount / total) * 100) : 0;

    return {
      total,
      dispensedCount,
      activeCount,
      classSubjectCount,
      classDispensedCount,
      percentDispensed,
    };
  }, [subjects, dispensationMap]);

  // Filtrage des matières
  const filteredSubjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return subjects.filter((s) => {
      const matchSearch = s.name.toLowerCase().includes(query);
      if (!matchSearch) return false;

      const isDisp = dispensationMap[s.id]?.isDispensed;

      if (activeTab === "DISPENSED") return isDisp;
      if (activeTab === "ACTIVE") return !isDisp;
      if (activeTab === "CLASS_ONLY") return s.isClassSubject;
      return true;
    });
  }, [subjects, searchQuery, activeTab, dispensationMap]);

  // Bascule rapide d'une dispense
  const handleToggleDispensation = async (
    subjectId: string,
    subjectName: string,
    forcedReason?: string
  ) => {
    const current = dispensationMap[subjectId] || { isDispensed: false, reason: null };
    const nextDispensed = !current.isDispensed;
    const finalReason = nextDispensed ? (forcedReason ?? current.reason) : null;

    // Optimistic Update
    setDispensationMap((prev) => ({
      ...prev,
      [subjectId]: {
        isDispensed: nextDispensed,
        reason: finalReason,
      },
    }));
    setLoadingSubjectId(subjectId);

    try {
      const res = await setDispensation(student.id, subjectId, nextDispensed, finalReason || undefined);

      if (!res.success) {
        // Rollback
        setDispensationMap((prev) => ({
          ...prev,
          [subjectId]: current,
        }));
        showToast(res.error || "Impossible de modifier la dispense.", "error");
      } else {
        showToast(
          nextDispensed
            ? `Dispense activée pour "${subjectName}".`
            : `Dispense levée pour "${subjectName}".`,
          "success"
        );
      }
    } catch {
      // Rollback
      setDispensationMap((prev) => ({
        ...prev,
        [subjectId]: current,
      }));
      showToast("Erreur de communication avec le serveur.", "error");
    } finally {
      setLoadingSubjectId(null);
    }
  };

  // Enregistrement du motif modifié
  const handleSaveReason = async () => {
    if (!editingModal) return;
    const { subjectId, subjectName, currentReason } = editingModal;
    const previous = dispensationMap[subjectId];

    // Optimistic
    setDispensationMap((prev) => ({
      ...prev,
      [subjectId]: {
        isDispensed: true,
        reason: currentReason.trim() || null,
      },
    }));

    setEditingModal(null);
    setLoadingSubjectId(subjectId);

    try {
      const res = await updateDispensationReason(student.id, subjectId, currentReason);
      if (!res.success) {
        setDispensationMap((prev) => ({
          ...prev,
          [subjectId]: previous,
        }));
        showToast(res.error || "Erreur lors de la mise à jour du motif.", "error");
      } else {
        showToast(`Motif enregistré pour "${subjectName}".`, "success");
      }
    } catch {
      setDispensationMap((prev) => ({
        ...prev,
        [subjectId]: previous,
      }));
      showToast("Erreur serveur lors de la mise à jour du motif.", "error");
    } finally {
      setLoadingSubjectId(null);
    }
  };

  // Traitement en masse (tout dispenser / tout réactiver)
  const handleExecuteBulk = () => {
    if (!bulkModal) return;
    const isDispensed = bulkModal === "DISPENSE_ALL";
    const targetSubjects = filteredSubjects.length > 0 ? filteredSubjects : subjects;
    const subjectIds = targetSubjects.map((s) => s.id);
    const reason = isDispensed ? bulkReason.trim() : undefined;

    const previousMap = { ...dispensationMap };

    // Optimistic
    setDispensationMap((prev) => {
      const next = { ...prev };
      for (const id of subjectIds) {
        next[id] = {
          isDispensed,
          reason: isDispensed ? reason || "Dispense collective" : null,
        };
      }
      return next;
    });

    setBulkModal(null);
    setBulkReason("");

    startTransition(async () => {
      const res = await setBulkDispensations(student.id, subjectIds, isDispensed, reason);
      if (!res.success) {
        setDispensationMap(previousMap);
        showToast(res.error || "Erreur lors de l'opération groupée.", "error");
      } else {
        showToast(
          isDispensed
            ? `${subjectIds.length} matières dispensées avec succès.`
            : `${subjectIds.length} matières réactivées avec succès.`,
          "success"
        );
      }
    });
  };

  const studentFullName = `${(student.lastName || "").toUpperCase()} ${student.firstName || ""}`.trim();
  const initials = `${(student.firstName?.[0] || "").toUpperCase()}${(student.lastName?.[0] || "").toUpperCase()}` || "EL";

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-white text-sm font-medium backdrop-blur-md ${
              toast.type === "success" ? "bg-emerald-600/95" : "bg-rose-600/95"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 p-1 hover:bg-white/20 rounded-lg transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Breadcrumb & Navigation */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/students"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Retour aux élèves</span>
            </Link>

            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-medium">
              <span>/</span>
              <Link href="/admin/students" className="hover:text-slate-600 transition">
                Élèves
              </Link>
              <span>/</span>
              <span className="text-slate-700 font-semibold truncate max-w-[200px]">
                {studentFullName}
              </span>
              <span>/</span>
              <span className="text-indigo-600 font-bold">Dispenses</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/dispenses"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200/60 transition shadow-xs"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Matrice globale par classe</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Student Banner Card */}
        <section className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-2xl sm:text-3xl shadow-lg ring-4 ring-white/10 shrink-0">
                {initials}
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    {studentFullName}
                  </h1>
                  {student.class ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {student.class.name}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
                      Sans classe
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                  {student.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{student.email}</span>
                    </div>
                  )}
                  {student.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{student.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 shrink-0">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>
                  {stats.activeCount} matière{stats.activeCount > 1 ? "s" : ""} suivie{stats.activeCount > 1 ? "s" : ""}
                </span>
              </div>
              {stats.dispensedCount > 0 && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/20 backdrop-blur-md border border-amber-400/30 text-amber-200 text-xs font-semibold">
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                  <span>
                    {stats.dispensedCount} dispense{stats.dispensedCount > 1 ? "s" : ""} active{stats.dispensedCount > 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-8 pt-6 border-t border-white/10">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <p className="text-xs font-medium text-slate-400">Total Matières</p>
              <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Disponibles dans l'école</p>
            </div>

            <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20">
              <p className="text-xs font-medium text-emerald-300">Enseignements Suivis</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">{stats.activeCount}</p>
              <p className="text-[11px] text-emerald-300/80 mt-0.5">Évalués &amp; notés</p>
            </div>

            <div className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/20">
              <p className="text-xs font-medium text-amber-300">Matières Dispensées</p>
              <p className="text-2xl font-black text-amber-400 mt-1">{stats.dispensedCount}</p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">Exclues des moyennes</p>
            </div>

            <div className="bg-indigo-500/10 rounded-2xl p-4 border border-indigo-500/20">
              <p className="text-xs font-medium text-indigo-300">Régime de Scolarité</p>
              <p className="text-base sm:text-lg font-bold text-indigo-200 mt-1 truncate">
                {stats.dispensedCount === 0 ? "Complet (100%)" : `Aménagé (-${stats.percentDispensed}%)`}
              </p>
              <p className="text-[11px] text-indigo-300/80 mt-0.5">Conformité Qualiopi</p>
            </div>
          </div>
        </section>

        {/* Info & Regulatory Notice */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-4 text-xs text-blue-900 leading-relaxed shadow-xs">
          <div className="p-2 bg-blue-100 rounded-xl text-blue-700 shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-blue-950">
              Impact pédagogique et réglementaire des dispenses
            </h2>
            <p className="text-blue-800">
              Lorsqu&apos;un élève est dispensé d&apos;une matière, il est <strong>automatiquement isolé et exclu</strong>{" "}
              des listes de notation des professeurs (<code className="bg-blue-100/80 px-1 py-0.5 rounded">/prof/notes</code>)
              et son coefficient est neutralisé dans les moyennes de bulletins semestriels.
              Chaque dispense peut être justifiée par un certificat médical ou une validation d&apos;acquis pour les audits Qualiopi.
            </p>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher une matière..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => setBulkModal("DISPENSE_ALL")}
                disabled={isPending || stats.dispensedCount === stats.total}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 border border-amber-200 rounded-xl transition shadow-2xs"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Tout dispenser</span>
              </button>

              <button
                onClick={() => setBulkModal("ACTIVATE_ALL")}
                disabled={isPending || stats.dispensedCount === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 border border-emerald-200 rounded-xl transition shadow-2xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Tout réactiver</span>
              </button>
            </div>
          </div>

          {/* Segmented Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === "ALL"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>Toutes les matières</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === "ALL" ? "bg-white/20 text-white" : "bg-white text-slate-700"}`}>
                {stats.total}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("DISPENSED")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === "DISPENSED"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Dispensées</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === "DISPENSED" ? "bg-white/20 text-white" : "bg-white text-slate-700"}`}>
                {stats.dispensedCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("ACTIVE")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === "ACTIVE"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Enseignements suivis</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === "ACTIVE" ? "bg-white/20 text-white" : "bg-white text-slate-700"}`}>
                {stats.activeCount}
              </span>
            </button>

            {student.class && (
              <button
                onClick={() => setActiveTab("CLASS_ONLY")}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === "CLASS_ONLY"
                    ? "bg-slate-800 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Programme de sa classe ({student.class.name})</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === "CLASS_ONLY" ? "bg-white/20 text-white" : "bg-white text-slate-700"}`}>
                  {stats.classSubjectCount}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Subjects List */}
        <section className="space-y-3">
          {filteredSubjects.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Filter className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Aucune matière trouvée</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Aucune matière ne correspond aux critères de recherche actuels.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveTab("ALL");
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredSubjects.map((subject) => {
                const info = dispensationMap[subject.id] || { isDispensed: false, reason: null };
                const isDispensed = info.isDispensed;
                const isLoading = loadingSubjectId === subject.id;

                return (
                  <div
                    key={subject.id}
                    className={`group relative bg-white rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between gap-4 ${
                      isDispensed
                        ? "border-amber-300/80 bg-gradient-to-br from-amber-50/30 to-white shadow-xs hover:border-amber-400"
                        : "border-slate-200/80 hover:border-indigo-300 shadow-xs hover:shadow-md"
                    }`}
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition ${
                              isDispensed
                                ? "bg-amber-100 text-amber-700"
                                : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"
                            }`}
                          >
                            {isDispensed ? (
                              <ShieldAlert className="h-5 w-5" />
                            ) : (
                              <BookOpen className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-900 transition leading-snug">
                              {subject.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {subject.isClassSubject ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                                  Programme classe
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500">
                                  Hors maquette classe
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isDispensed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300/60">
                              <ShieldAlert className="h-3 w-3" />
                              Dispensé
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" />
                              Actif
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Dispensation Motif / Reason Display */}
                      {isDispensed && (
                        <div className="mt-3.5 p-3 rounded-xl bg-amber-100/60 border border-amber-200/70 text-xs text-amber-900 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold flex items-center gap-1.5 text-amber-950">
                              <FileText className="h-3.5 w-3.5 text-amber-700" />
                              Motif de la dispense :
                            </span>
                            <button
                              onClick={() =>
                                setEditingModal({
                                  subjectId: subject.id,
                                  subjectName: subject.name,
                                  currentReason: info.reason || "",
                                })
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 underline underline-offset-2 transition"
                            >
                              <Edit3 className="h-3 w-3" />
                              Modifier
                            </button>
                          </div>
                          <p className="italic text-slate-700">
                            {info.reason || "Aucun motif précisé (dispense d'office)"}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="text-[11px] text-slate-500 font-medium">
                        {isDispensed
                          ? "Exclu des notes & moyennes"
                          : "Comptabilisé dans les relevés"}
                      </div>

                      <div className="flex items-center gap-2">
                        {isDispensed && (
                          <button
                            type="button"
                            onClick={() =>
                              setEditingModal({
                                subjectId: subject.id,
                                subjectName: subject.name,
                                currentReason: info.reason || "",
                              })
                            }
                            title="Ajouter ou modifier le motif"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        )}

                        {/* Interactive Modern Action Toggle Button */}
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleToggleDispensation(subject.id, subject.name)}
                          className={`relative inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs active:scale-95 ${
                            isLoading
                              ? "opacity-60 cursor-not-allowed bg-slate-200 text-slate-500"
                              : isDispensed
                              ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
                              : "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200"
                          }`}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Mise à jour...</span>
                            </>
                          ) : isDispensed ? (
                            <>
                              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                              <span>Réactiver</span>
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="h-3.5 w-3.5" />
                              <span>Dispenser</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Modal Edition Motif */}
      {editingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                <FileText className="h-5 w-5" />
                <span>Motif de la dispense</span>
              </div>
              <button
                onClick={() => setEditingModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <h4 className="text-base font-black text-slate-900">
                {editingModal.subjectName}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Indiquez le justificatif officiel de cette dispense pour le dossier de l'élève.
              </p>
            </div>

            {/* Presets Chips */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Suggestions rapides :</label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_REASONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      setEditingModal((prev) => (prev ? { ...prev, currentReason: preset } : null))
                    }
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 transition text-left"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Textarea */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Motif personnalisé :</label>
              <textarea
                rows={3}
                value={editingModal.currentReason}
                onChange={(e) =>
                  setEditingModal((prev) =>
                    prev ? { ...prev, currentReason: e.target.value } : null
                  )
                }
                placeholder="Ex: Certificat médical du 12/09/2026 dispensant de toute pratique sportive."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveReason}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Enregistrer le motif</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation Bulk */}
      {bulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div
                className={`p-2 rounded-xl ${
                  bulkModal === "DISPENSE_ALL"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {bulkModal === "DISPENSE_ALL" ? (
                  <ShieldAlert className="h-6 w-6" />
                ) : (
                  <RotateCcw className="h-6 w-6" />
                )}
              </div>
              <button
                onClick={() => setBulkModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">
                {bulkModal === "DISPENSE_ALL"
                  ? "Dispenser de toutes les matières ?"
                  : "Réactiver toutes les matières ?"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {bulkModal === "DISPENSE_ALL"
                  ? `Cette action appliquera le statut dispensé à ${filteredSubjects.length} matière(s) pour l'élève ${studentFullName}.`
                  : `Cette action réactivera ${filteredSubjects.length} matière(s) pour l'élève ${studentFullName}.`}
              </p>
            </div>

            {bulkModal === "DISPENSE_ALL" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Motif global (optionnel) :
                </label>
                <input
                  type="text"
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  placeholder="Ex: Stage longue durée, aménagement de cursus..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleExecuteBulk}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-md ${
                  bulkModal === "DISPENSE_ALL"
                    ? "bg-amber-600 hover:bg-amber-700 shadow-amber-200"
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                }`}
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Confirmer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
