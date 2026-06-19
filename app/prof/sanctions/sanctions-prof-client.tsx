"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  Search,
  ShieldAlert,
  Clock,
  AlertTriangle,
  X,
} from "lucide-react";
import { assignSanction, deleteSanction } from "@/app/actions/sanctions";

type StudentOption = {
  id: string;
  name: string;
  className: string;
};

type SanctionType = {
  id: string;
  name: string;
  description: string | null;
  allowTeacher: boolean;
  allowAdmin: boolean;
};

type SanctionInstance = {
  id: string;
  studentId: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    class: { id: string; name: string } | null;
  };
  sanctionTypeId: string;
  sanctionType: SanctionType;
  reason: string;
  duration: string | null;
  date: Date | string;
};

type Props = {
  students: StudentOption[];
  sanctionTypes: SanctionType[];
  initialSanctions: SanctionInstance[];
};

export default function SanctionsProfClient({
  students,
  sanctionTypes,
  initialSanctions,
}: Props) {
  const [sanctions, setSanctions] = useState<SanctionInstance[]>(initialSanctions);
  const [searchQuery, setSearchQuery] = useState("");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const assignDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dlg = assignDialogRef.current;
    if (!dlg) return;
    if (assignModalOpen && !dlg.open) dlg.showModal();
    if (!assignModalOpen && dlg.open) dlg.close();
  }, [assignModalOpen]);

  // Filtered sanctions
  const filteredSanctions = sanctions.filter((s) => {
    const studentName = `${s.student.lastName} ${s.student.firstName}`.toLowerCase();
    const reason = s.reason.toLowerCase();
    const typeName = s.sanctionType.name.toLowerCase();
    const query = searchQuery.toLowerCase();

    return (
      studentName.includes(query) ||
      reason.includes(query) ||
      typeName.includes(query)
    );
  });

  // Handle Assign Sanction Submit
  const handleAssignSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAssignError(null);
    setPending(true);

    const fd = new FormData(e.currentTarget);
    const studentId = fd.get("studentId") as string;
    const sanctionTypeId = fd.get("sanctionTypeId") as string;
    const reason = fd.get("reason") as string;
    const duration = fd.get("duration") as string;
    const date = fd.get("date") as string;

    if (!studentId || !sanctionTypeId || !reason.trim()) {
      setAssignError("L'élève, le type de sanction et le motif sont obligatoires.");
      setPending(false);
      return;
    }

    try {
      const res = await assignSanction({
        studentId,
        sanctionTypeId,
        reason,
        duration,
        date,
      });

      if (res.ok) {
        window.location.reload();
      }
    } catch (err: any) {
      setAssignError(err.message || "Une erreur est survenue.");
    } finally {
      setPending(false);
    }
  };

  // Handle Delete Sanction
  const handleDeleteSanction = async (id: string) => {
    if (!confirm("Voulez-vous vraiment annuler cette sanction ?")) {
      return;
    }

    try {
      const res = await deleteSanction(id);
      if (res.ok) {
        setSanctions(sanctions.filter((s) => s.id !== id));
      }
    } catch (err: any) {
      alert(err.message || "Erreur lors de la suppression.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher parmi vos sanctions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition"
          />
        </div>

        <button
          onClick={() => setAssignModalOpen(true)}
          disabled={sanctionTypes.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
        >
          <Plus className="h-4 w-4" /> Attribuer une Sanction
        </button>
      </div>

      {sanctionTypes.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Aucun type de sanction n'est actuellement autorisé pour les enseignants par l'administration.
        </div>
      )}

      {/* Sanctions List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-widest font-black text-[10px]">
                <th className="px-6 py-4">Élève</th>
                <th className="px-6 py-4">Type de Sanction</th>
                <th className="px-6 py-4">Motif</th>
                <th className="px-6 py-4">Date & Durée</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSanctions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest italic">
                    Aucune sanction enregistrée par vos soins.
                  </td>
                </tr>
              ) : (
                filteredSanctions.map((s) => {
                  const formattedDate = new Date(s.date).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  });

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4">
                        <div className="font-black text-slate-900">
                          {s.student.lastName} {s.student.firstName}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                          {s.student.class?.name || "Sans classe"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-100 shadow-sm">
                          <ShieldAlert className="h-3 w-3" />
                          {s.sanctionType.name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-700 font-medium max-w-xs break-words whitespace-pre-line">
                          {s.reason}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {formattedDate}
                        </div>
                        {s.duration && (
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-0.5">
                            Durée : {s.duration}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteSanction(s.id)}
                          className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-xl transition border border-slate-200 hover:border-red-200"
                          title="Supprimer la sanction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DIALOG: ASSIGN SANCTION MODAL */}
      <dialog
        ref={assignDialogRef}
        onClose={() => setAssignModalOpen(false)}
        className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100%-2rem)] w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-900/40"
        onCancel={(e) => {
          e.preventDefault();
          setAssignModalOpen(false);
        }}
      >
        <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-950">
              Attribuer une Sanction
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
              Sélectionnez un élève de vos classes et indiquez le motif.
            </p>
          </div>
          <button
            onClick={() => setAssignModalOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[70vh]">
          {assignError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {assignError}
            </div>
          )}

          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                Sélectionner l'Élève *
              </label>
              <select
                name="studentId"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
              >
                <option value="">-- Choisir un élève --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.className}] {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                Type de Sanction *
              </label>
              <select
                name="sanctionTypeId"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
              >
                <option value="">-- Choisir un type --</option>
                {sanctionTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                  Date de la sanction
                </label>
                <input
                  type="date"
                  name="date"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                  Durée (Optionnel)
                </label>
                <input
                  type="text"
                  name="duration"
                  placeholder="Ex: 2 heures, 3 jours..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                Motif détaillé *
              </label>
              <textarea
                name="reason"
                required
                placeholder="Raison de la sanction..."
                rows={4}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider text-slate-700 transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={pending}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-wider text-white transition disabled:opacity-50"
              >
                {pending ? "Création..." : "Attribuer"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  );
}
