"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Users,
  GraduationCap,
  Sparkles,
  ExternalLink,
  Loader2,
  X,
  FileText,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Info,
} from "lucide-react";
import { setDispensation, updateDispensationReason } from "@/app/admin/students/actions";

export interface ClassDispenseStudent {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  dispensations: {
    id: string;
    subjectId: string;
    reason: string | null;
  }[];
}

export interface ClassDispenseItem {
  id: string;
  name: string;
  students: ClassDispenseStudent[];
  classSubjectIds?: string[];
}

export interface SubjectHeaderItem {
  id: string;
  name: string;
}

interface AdminDispensesClientProps {
  classes: ClassDispenseItem[];
  subjects: SubjectHeaderItem[];
  initialClassId?: string;
}

export default function AdminDispensesClient({
  classes,
  subjects,
  initialClassId,
}: AdminDispensesClientProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (initialClassId && classes.some((c) => c.id === initialClassId)) {
      return initialClassId;
    }
    return classes[0]?.id || "";
  });

  const [searchStudent, setSearchStudent] = useState("");
  const [studentFilter, setStudentFilter] = useState<"ALL" | "WITH_DISPENSE" | "WITHOUT_DISPENSE">("ALL");
  const [onlyClassSubjects, setOnlyClassSubjects] = useState(false);

  // Local state map: `${studentId}_${subjectId}` -> { isDispensed: boolean; reason: string | null }
  const [matrixState, setMatrixState] = useState<
    Record<string, { isDispensed: boolean; reason: string | null }>
  >(() => {
    const map: Record<string, { isDispensed: boolean; reason: string | null }> = {};
    for (const cls of classes) {
      for (const st of cls.students) {
        for (const disp of st.dispensations) {
          map[`${st.id}_${disp.subjectId}`] = {
            isDispensed: true,
            reason: disp.reason || null,
          };
        }
      }
    }
    return map;
  });

  // Track active mutations
  const [loadingCellKey, setLoadingCellKey] = useState<string | null>(null);

  // Toast feedback
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Modal edit reason
  const [reasonModal, setReasonModal] = useState<{
    studentId: string;
    studentName: string;
    subjectId: string;
    subjectName: string;
    reason: string;
  } | null>(null);

  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  // Subject filtering
  const visibleSubjects = useMemo(() => {
    if (!onlyClassSubjects || !selectedClass?.classSubjectIds?.length) {
      return subjects;
    }
    const set = new Set(selectedClass.classSubjectIds);
    return subjects.filter((s) => set.has(s.id));
  }, [subjects, onlyClassSubjects, selectedClass]);

  // Students filtering
  const filteredStudents = useMemo(() => {
    if (!selectedClass) return [];
    const query = searchStudent.trim().toLowerCase();

    return selectedClass.students.filter((st) => {
      const fullName = `${st.lastName || ""} ${st.firstName || ""}`.toLowerCase();
      const matchSearch = fullName.includes(query) || (st.email || "").toLowerCase().includes(query);
      if (!matchSearch) return false;

      // Count dispenses in visible subjects
      const dispCount = visibleSubjects.filter(
        (s) => matrixState[`${st.id}_${s.id}`]?.isDispensed
      ).length;

      if (studentFilter === "WITH_DISPENSE") return dispCount > 0;
      if (studentFilter === "WITHOUT_DISPENSE") return dispCount === 0;
      return true;
    });
  }, [selectedClass, searchStudent, studentFilter, matrixState, visibleSubjects]);

  // Stats for the selected class
  const classStats = useMemo(() => {
    if (!selectedClass) {
      return { totalStudents: 0, studentsWithDispense: 0, totalDispensations: 0 };
    }
    const totalStudents = selectedClass.students.length;
    let studentsWithDispense = 0;
    let totalDispensations = 0;

    for (const st of selectedClass.students) {
      let stDispCount = 0;
      for (const s of subjects) {
        if (matrixState[`${st.id}_${s.id}`]?.isDispensed) {
          stDispCount++;
          totalDispensations++;
        }
      }
      if (stDispCount > 0) studentsWithDispense++;
    }

    return { totalStudents, studentsWithDispense, totalDispensations };
  }, [selectedClass, subjects, matrixState]);

  // Cell toggle
  const handleToggleCell = async (
    studentId: string,
    studentName: string,
    subjectId: string,
    subjectName: string
  ) => {
    const key = `${studentId}_${subjectId}`;
    const current = matrixState[key] || { isDispensed: false, reason: null };
    const nextDispensed = !current.isDispensed;

    // Optimistic Update
    setMatrixState((prev) => ({
      ...prev,
      [key]: {
        isDispensed: nextDispensed,
        reason: nextDispensed ? current.reason : null,
      },
    }));
    setLoadingCellKey(key);

    try {
      const res = await setDispensation(studentId, subjectId, nextDispensed, current.reason || undefined);

      if (!res.success) {
        // Rollback
        setMatrixState((prev) => ({
          ...prev,
          [key]: current,
        }));
        showToast(res.error || "Impossible de modifier la dispense.", "error");
      } else {
        showToast(
          nextDispensed
            ? `Dispense activée : ${studentName} pour ${subjectName}`
            : `Dispense retirée : ${studentName} pour ${subjectName}`,
          "success"
        );
      }
    } catch {
      setMatrixState((prev) => ({
        ...prev,
        [key]: current,
      }));
      showToast("Erreur serveur lors de la mise à jour.", "error");
    } finally {
      setLoadingCellKey(null);
    }
  };

  // Save reason from modal
  const handleSaveReason = async () => {
    if (!reasonModal) return;
    const { studentId, subjectId, studentName, subjectName, reason } = reasonModal;
    const key = `${studentId}_${subjectId}`;
    const previous = matrixState[key];

    setMatrixState((prev) => ({
      ...prev,
      [key]: {
        isDispensed: true,
        reason: reason.trim() || null,
      },
    }));
    setReasonModal(null);
    setLoadingCellKey(key);

    try {
      const res = await updateDispensationReason(studentId, subjectId, reason);
      if (!res.success) {
        setMatrixState((prev) => ({ ...prev, [key]: previous }));
        showToast(res.error || "Erreur de mise à jour du motif.", "error");
      } else {
        showToast(`Motif enregistré pour ${studentName} (${subjectName}).`, "success");
      }
    } catch {
      setMatrixState((prev) => ({ ...prev, [key]: previous }));
      showToast("Erreur serveur.", "error");
    } finally {
      setLoadingCellKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
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

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                <ShieldCheck className="h-3.5 w-3.5" />
                Scolarité &amp; Pédagogie
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Matrice des Dispenses par Classe
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              Gérez les exemptions d&apos;évaluations et de cours par promotion. Cliquez sur une case pour basculer le statut ou ouvrez la fiche détaillée d&apos;un élève.
            </p>
          </div>

          {/* Quick Metrics */}
          {selectedClass && (
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center min-w-[110px]">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Élèves</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">{classStats.totalStudents}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-center min-w-[110px]">
                <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Dispensés</p>
                <p className="text-2xl font-black text-amber-800 mt-0.5">{classStats.studentsWithDispense}</p>
              </div>
              <div className="bg-indigo-50 border border-indigo-200/80 rounded-2xl p-4 text-center min-w-[110px]">
                <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Dispenses</p>
                <p className="text-2xl font-black text-indigo-800 mt-0.5">{classStats.totalDispensations}</p>
              </div>
            </div>
          )}
        </div>

        {/* Class Selection Tabs */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex items-center gap-2 overflow-x-auto">
          {classes.map((cls) => {
            const isSelected = selectedClassId === cls.id;
            return (
              <button
                key={cls.id}
                onClick={() => setSelectedClassId(cls.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-102"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60"
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                <span>{cls.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] ${
                    isSelected ? "bg-white/20 text-white" : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  {cls.students.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrer par nom d'élève ou email..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
              {searchStudent && (
                <button
                  onClick={() => setSearchStudent("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <button
                onClick={() => setStudentFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  studentFilter === "ALL"
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Tous ({selectedClass?.students.length || 0})
              </button>
              <button
                onClick={() => setStudentFilter("WITH_DISPENSE")}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                  studentFilter === "WITH_DISPENSE"
                    ? "bg-amber-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Dispensés ({classStats.studentsWithDispense})</span>
              </button>
              <button
                onClick={() => setStudentFilter("WITHOUT_DISPENSE")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  studentFilter === "WITHOUT_DISPENSE"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Sans dispense ({classStats.totalStudents - classStats.studentsWithDispense})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto text-xs font-medium">
            <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition">
              <input
                type="checkbox"
                checked={onlyClassSubjects}
                onChange={(e) => setOnlyClassSubjects(e.target.checked)}
                className="h-3.5 w-3.5 rounded-md text-indigo-600 focus:ring-indigo-500"
              />
              <span>Matières de la classe uniquement</span>
            </label>
          </div>
        </div>

        {/* Matrix Table */}
        {!selectedClass ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
            <GraduationCap className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Aucune classe disponible</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh]">
              <table className="w-full border-collapse text-left text-xs">
                {/* Table Header */}
                <thead className="bg-slate-100/90 backdrop-blur-xs sticky top-0 z-20 border-b border-slate-200 shadow-2xs">
                  <tr>
                    <th className="p-4 font-bold text-slate-700 sticky left-0 bg-slate-100/95 z-30 min-w-[240px] max-w-[280px] shadow-xs">
                      Élève ({filteredStudents.length})
                    </th>
                    {visibleSubjects.map((s) => (
                      <th
                        key={s.id}
                        className="p-3 text-center font-bold text-slate-700 min-w-[130px] max-w-[170px] border-l border-slate-200/60"
                        title={s.name}
                      >
                        <div className="truncate px-1 text-slate-800" title={s.name}>
                          {s.name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={visibleSubjects.length + 1}
                        className="p-12 text-center text-slate-400 font-medium"
                      >
                        Aucun élève ne correspond aux critères de recherche.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st) => {
                      const studentName = `${(st.lastName || "").toUpperCase()} ${st.firstName || ""}`.trim();
                      const initials = `${(st.firstName?.[0] || "").toUpperCase()}${(st.lastName?.[0] || "").toUpperCase()}` || "EL";

                      // Total dispenses for this student
                      const studentDispensesCount = visibleSubjects.filter(
                        (s) => matrixState[`${st.id}_${s.id}`]?.isDispensed
                      ).length;

                      return (
                        <tr
                          key={st.id}
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          {/* Student Header Cell */}
                          <td className="p-3.5 sticky left-0 bg-white group-hover:bg-slate-50/95 z-10 border-r border-slate-200/80 shadow-xs">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200/50 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <Link
                                    href={`/admin/students/${st.id}/dispenses`}
                                    className="font-bold text-slate-900 hover:text-indigo-600 transition truncate block leading-snug"
                                    title={studentName}
                                  >
                                    {studentName}
                                  </Link>
                                  <p className="text-[10px] text-slate-400 truncate">
                                    {st.email || "Sans email"}
                                  </p>
                                </div>
                              </div>

                              <Link
                                href={`/admin/students/${st.id}/dispenses`}
                                title="Gérer les dispenses individuelles"
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition shrink-0"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                            </div>
                          </td>

                          {/* Subject Dispensation Cells */}
                          {visibleSubjects.map((subject) => {
                            const cellKey = `${st.id}_${subject.id}`;
                            const cellInfo = matrixState[cellKey] || { isDispensed: false, reason: null };
                            const isDispensed = cellInfo.isDispensed;
                            const isLoading = loadingCellKey === cellKey;

                            return (
                              <td
                                key={subject.id}
                                className={`p-2.5 text-center border-l border-slate-100 transition-colors ${
                                  isDispensed ? "bg-amber-50/40" : ""
                                }`}
                              >
                                <div className="inline-flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    disabled={isLoading}
                                    onClick={() =>
                                      handleToggleCell(
                                        st.id,
                                        studentName,
                                        subject.id,
                                        subject.name
                                      )
                                    }
                                    title={
                                      isDispensed
                                        ? `Dispensé. Motif: ${cellInfo.reason || "Aucun motif"}. Cliquez pour réactiver.`
                                        : `Actif. Cliquez pour dispenser.`
                                    }
                                    className={`relative inline-flex items-center justify-center p-2 rounded-xl text-xs font-bold transition-all duration-200 shadow-2xs active:scale-95 ${
                                      isLoading
                                        ? "opacity-60 cursor-not-allowed bg-slate-200 text-slate-500"
                                        : isDispensed
                                        ? "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200/50 ring-2 ring-amber-300"
                                        : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                                    }`}
                                  >
                                    {isLoading ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : isDispensed ? (
                                      <ShieldAlert className="h-3.5 w-3.5" />
                                    ) : (
                                      <span className="w-3.5 h-3.5 rounded-full bg-slate-300 block" />
                                    )}
                                  </button>

                                  {isDispensed && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setReasonModal({
                                          studentId: st.id,
                                          studentName,
                                          subjectId: subject.id,
                                          subjectName: subject.name,
                                          reason: cellInfo.reason || "",
                                        })
                                      }
                                      title="Modifier le motif de dispense"
                                      className="p-1 text-amber-700 hover:text-amber-900 hover:bg-amber-100/60 rounded-md transition"
                                    >
                                      <FileText className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Matrix Legend Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-4">
                <span className="font-bold text-slate-700">Légende :</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-slate-300 inline-block" />
                  <span>Enseignement suivi (noté)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-md bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">
                    <ShieldAlert className="h-2.5 w-2.5" />
                  </span>
                  <span className="font-semibold text-amber-800">Élève dispensé</span>
                </div>
              </div>

              <div className="text-slate-400 text-[11px]">
                Cliquez sur une case pour basculer le statut ou sur l&apos;icône feuille pour éditer le motif.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Edition Motif */}
      {reasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                <FileText className="h-5 w-5" />
                <span>Motif de la dispense</span>
              </div>
              <button
                onClick={() => setReasonModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900">
                {reasonModal.studentName} — {reasonModal.subjectName}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Renseignez le justificatif officiel de dispense.
              </p>
            </div>

            <textarea
              rows={3}
              value={reasonModal.reason}
              onChange={(e) =>
                setReasonModal((prev) => (prev ? { ...prev, reason: e.target.value } : null))
              }
              placeholder="Ex: Certificat médical d'inaptitude, validation VAE..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReasonModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveReason}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition"
              >
                Enregistrer le motif
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
