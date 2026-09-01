"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileWarning,
  Calendar,
  Clock,
  BookOpen,
  DoorOpen,
  User,
  GraduationCap,
  X,
  CheckCircle2,
  XCircle,
  FileText,
  ArrowRight,
  Sparkles,
  Phone,
  Mail,
  AlertCircle
} from "lucide-react";

export interface SubstitutionRequestItem {
  id: string;
  originalTeacherId: string;
  substituteTeacherId?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: Date | string;
  originalTeacher: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email?: string | null;
    phone?: string | null;
  };
  substituteTeacher?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  lesson: {
    id: string;
    startTime: Date | string;
    endTime: Date | string;
    isFreeLesson: boolean;
    customSubject?: string | null;
    customTeacher?: string | null;
    replacementNote?: string | null;
    subjectId?: string | null;
    subject?: {
      id: string;
      name: string;
    } | null;
    class: {
      id: string;
      name: string;
    };
    room?: {
      id: string;
      name: string;
    } | null;
  };
}

export interface TeacherItem {
  id: string;
  firstName: string | null;
  lastName: string | null;
  subjects?: { id: string; name: string }[];
}

export interface SubjectItem {
  id: string;
  name: string;
}

interface AdminSubstitutionsFeedProps {
  initialRequests: SubstitutionRequestItem[];
  teachers?: TeacherItem[];
  allSubjects?: SubjectItem[];
}

export default function AdminSubstitutionsFeed({
  initialRequests,
  teachers = [],
  allSubjects = [],
}: AdminSubstitutionsFeedProps) {
  const router = useRouter();
  const [selectedSub, setSelectedSub] = useState<SubstitutionRequestItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [subTeacherId, setSubTeacherId] = useState("");
  const [subSubjectId, setSubSubjectId] = useState("");

  const handleOpenModal = (sub: SubstitutionRequestItem) => {
    setSelectedSub(sub);
    setSubTeacherId("");
    setSubSubjectId(sub.lesson.subjectId || (allSubjects[0]?.id ?? ""));
  };

  const handleCloseModal = () => {
    setSelectedSub(null);
    setSubTeacherId("");
    setSubSubjectId("");
  };

  const handleAction = async (status: "APPROVED" | "REJECTED") => {
    if (!selectedSub) return;

    if (status === "APPROVED" && !subTeacherId) {
      alert("Veuillez sélectionner un professeur de remplacement.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/substitutions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedSub.id,
          status,
          substituteTeacherId: status === "APPROVED" ? subTeacherId : undefined,
          subjectId: status === "APPROVED" ? (subSubjectId || undefined) : undefined,
        }),
      });

      if (res.ok) {
        handleCloseModal();
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Une erreur est survenue.");
      }
    } catch (err) {
      console.error(err);
      alert("Une erreur de connexion est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const selectedTeacher = teachers.find((t) => t.id === subTeacherId);
  const availableSubjects = selectedTeacher?.subjects?.length
    ? selectedTeacher.subjects
    : allSubjects;

  if (initialRequests.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-orange-500/10 border border-orange-500/20 p-5 rounded-[2rem] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-400 flex items-center gap-2">
            <FileWarning className="h-4 w-4 text-orange-400" />
            Remplacements ({initialRequests.length})
          </h3>
          <Link
            href="/admin/substitutions"
            className="text-[9px] font-bold text-orange-300 hover:text-orange-100 underline tracking-wider uppercase transition"
          >
            Voir tout →
          </Link>
        </div>

        <div className="space-y-2">
          {initialRequests.map((sub) => {
            const courseName = sub.lesson.isFreeLesson
              ? sub.lesson.customSubject || "Cours libre"
              : sub.lesson.subject?.name || "Sans matière";

            const formattedDate = format(
              new Date(sub.lesson.startTime),
              "EEEE d MMMM",
              { locale: fr }
            );
            const formattedTime = `${format(new Date(sub.lesson.startTime), "HH:mm")} - ${format(new Date(sub.lesson.endTime), "HH:mm")}`;

            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => handleOpenModal(sub)}
                className="w-full text-left p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all duration-200 group flex items-start justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse shrink-0"></span>
                    <p className="text-xs font-black text-orange-100 truncate group-hover:text-white transition">
                      {sub.originalTeacher.firstName} {sub.originalTeacher.lastName}
                    </p>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-300 truncate">
                    {courseName} • <span className="text-slate-400">{sub.lesson.class.name}</span>
                  </p>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">
                    {formattedDate} ({formattedTime})
                  </p>
                </div>
                <div className="h-7 w-7 rounded-xl bg-orange-500/20 text-orange-300 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-orange-500/30 transition">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* MODAL FENÊTRE AVEC LES DONNÉES DU COURS À REMPLACER */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex justify-between items-start shrink-0 relative">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest">
                  <FileWarning className="h-3.5 w-3.5" />
                  Demande de Remplacement
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">
                  Détails du cours à remplacer
                </h3>
                <p className="text-xs text-slate-300 font-medium">
                  Demandé par {selectedSub.originalTeacher.firstName} {selectedSub.originalTeacher.lastName}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="h-8 w-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-slate-300 hover:text-white transition"
                title="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 custom-scrollbar">
              {/* Informations Générales du Cours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Matière / Cours */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Matière / Enseignement
                    </p>
                    <p className="text-sm font-black text-slate-900 mt-0.5">
                      {selectedSub.lesson.isFreeLesson
                        ? selectedSub.lesson.customSubject || "Cours libre"
                        : selectedSub.lesson.subject?.name || "Sans matière"}
                    </p>
                  </div>
                </div>

                {/* Classe */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Classe concernée
                    </p>
                    <p className="text-sm font-black text-slate-900 mt-0.5">
                      {selectedSub.lesson.class.name}
                    </p>
                  </div>
                </div>

                {/* Date & Heure */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Date & Créneau Horaire
                    </p>
                    <p className="text-xs font-black text-slate-900 capitalize mt-0.5">
                      {format(new Date(selectedSub.lesson.startTime), "EEEE d MMMM yyyy", { locale: fr })}
                    </p>
                    <p className="text-xs font-bold text-slate-600">
                      {format(new Date(selectedSub.lesson.startTime), "HH:mm")} - {format(new Date(selectedSub.lesson.endTime), "HH:mm")}
                    </p>
                  </div>
                </div>

                {/* Salle */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <DoorOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Salle de cours
                    </p>
                    <p className="text-sm font-black text-slate-900 mt-0.5">
                      {selectedSub.lesson.room?.name || "Non spécifiée"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Fiche Professeur Demandeur */}
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-amber-600" />
                    Professeur Absent
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    Demandé le {format(new Date(selectedSub.createdAt), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}
                  </span>
                </div>
                <p className="text-sm font-black text-slate-900">
                  M./Mme {selectedSub.originalTeacher.firstName} {selectedSub.originalTeacher.lastName}
                </p>
                {(selectedSub.originalTeacher.email || selectedSub.originalTeacher.phone) && (
                  <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600 pt-1">
                    {selectedSub.originalTeacher.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-slate-400" />
                        {selectedSub.originalTeacher.email}
                      </span>
                    )}
                    {selectedSub.originalTeacher.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {selectedSub.originalTeacher.phone}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Motif / Note de remplacement si elle existe */}
              {selectedSub.lesson.replacementNote && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                    Motif / Note explicative
                  </p>
                  <p className="text-xs text-slate-700 font-medium italic">
                    "{selectedSub.lesson.replacementNote}"
                  </p>
                </div>
              )}

              {/* Action Form: Assignation d'un remplaçant */}
              <div className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200 rounded-2xl space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  Traiter la demande de remplacement
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Professeur Remplaçant *
                    </label>
                    <select
                      className="w-full text-xs font-semibold rounded-xl border-slate-200 bg-white py-2 px-3 shadow-sm focus:border-blue-500 focus:ring-blue-500/20"
                      value={subTeacherId}
                      onChange={(e) => setSubTeacherId(e.target.value)}
                    >
                      <option value="">-- Choisir un professeur --</option>
                      {teachers
                        .filter((t) => t.id !== selectedSub.originalTeacherId)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.lastName?.toUpperCase()} {t.firstName}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Matière Enseignée
                    </label>
                    <select
                      className="w-full text-xs font-semibold rounded-xl border-slate-200 bg-white py-2 px-3 shadow-sm focus:border-blue-500 focus:ring-blue-500/20"
                      value={subSubjectId}
                      onChange={(e) => setSubSubjectId(e.target.value)}
                    >
                      {availableSubjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleAction("REJECTED")}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-black text-red-600 bg-red-50 hover:bg-red-100 transition border border-red-200 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="h-4 w-4" />
                    Refuser
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction("APPROVED")}
                    disabled={loading || !subTeacherId}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {loading ? "Enregistrement..." : "Confirmer le remplacement"}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
              <span className="font-semibold">ID cours : {selectedSub.lesson.id}</span>
              <Link
                href="/admin/substitutions"
                onClick={handleCloseModal}
                className="font-bold text-blue-600 hover:underline flex items-center gap-1 uppercase text-[10px] tracking-wider"
              >
                Ouvrir dans la gestion des remplacements →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
