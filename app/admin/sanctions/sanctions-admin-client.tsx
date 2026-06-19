"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  Search,
  ShieldAlert,
  Clock,
  User,
  AlertTriangle,
  X,
  CheckCircle,
} from "lucide-react";
import {
  createSanctionType,
  updateSanctionType,
  deleteSanctionType,
  assignSanction,
  deleteSanction,
} from "@/app/actions/sanctions";

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
  createdAt: Date;
};

type SanctionInstance = {
  id: string;
  studentId: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    class: { id: string; name: string } | null;
  };
  sanctionTypeId: string;
  sanctionType: SanctionType;
  reason: string;
  duration: string | null;
  date: Date | string;
  givenById: string;
  givenBy: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
};

type Props = {
  initialSanctions: SanctionInstance[];
  initialTypes: SanctionType[];
  students: StudentOption[];
};

export default function SanctionsAdminClient({
  initialSanctions,
  initialTypes,
  students,
}: Props) {
  const [tab, setTab] = useState<"issued" | "config">("issued");
  const [sanctions, setSanctions] = useState<SanctionInstance[]>(initialSanctions);
  const [types, setTypes] = useState<SanctionType[]>(initialTypes);
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");

  // Modals state
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<SanctionType | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Form states
  const [typeError, setTypeError] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const typeDialogRef = useRef<HTMLDialogElement>(null);
  const assignDialogRef = useRef<HTMLDialogElement>(null);

  // Sync native dialogs
  useEffect(() => {
    const dlg = typeDialogRef.current;
    if (!dlg) return;
    if (typeModalOpen && !dlg.open) dlg.showModal();
    if (!typeModalOpen && dlg.open) dlg.close();
  }, [typeModalOpen]);

  useEffect(() => {
    const dlg = assignDialogRef.current;
    if (!dlg) return;
    if (assignModalOpen && !dlg.open) dlg.showModal();
    if (!assignModalOpen && dlg.open) dlg.close();
  }, [assignModalOpen]);

  // Unique class list for filter
  const classes = Array.from(
    new Set(students.map((s) => s.className).filter(Boolean))
  );

  // Filtered sanctions
  const filteredSanctions = sanctions.filter((s) => {
    const studentName = `${s.student.lastName} ${s.student.firstName}`.toLowerCase();
    const reason = s.reason.toLowerCase();
    const typeName = s.sanctionType.name.toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      studentName.includes(query) ||
      reason.includes(query) ||
      typeName.includes(query);

    const matchesClass =
      !classFilter || s.student.class?.name === classFilter;

    return matchesSearch && matchesClass;
  });

  // Handle Sanction Type Submit (Create or Update)
  const handleTypeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTypeError(null);
    setPending(true);

    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    const description = fd.get("description") as string;
    const allowTeacher = fd.get("allowTeacher") === "true";
    const allowAdmin = fd.get("allowAdmin") === "true";

    if (!name.trim()) {
      setTypeError("Le nom du type de sanction est obligatoire.");
      setPending(false);
      return;
    }

    if (!allowTeacher && !allowAdmin) {
      setTypeError("La sanction doit être attribuable par au moins un rôle (profs ou admins).");
      setPending(false);
      return;
    }

    try {
      if (editingType) {
        const res = await updateSanctionType(editingType.id, {
          name,
          description,
          allowTeacher,
          allowAdmin,
        });
        if (res.ok) {
          setTypes(
            types.map((t) => (t.id === editingType.id ? (res.sanctionType as any) : t))
          );
          setTypeModalOpen(false);
        }
      } else {
        const res = await createSanctionType({
          name,
          description,
          allowTeacher,
          allowAdmin,
        });
        if (res.ok) {
          setTypes([...types, res.sanctionType as any].sort((a, b) => a.name.localeCompare(b.name)));
          setTypeModalOpen(false);
        }
      }
    } catch (err: any) {
      setTypeError(err.message || "Une erreur est survenue.");
    } finally {
      setPending(false);
    }
  };

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
        // Fetch fresh sanctions to ensure relations are correctly structured
        window.location.reload();
      }
    } catch (err: any) {
      setAssignError(err.message || "Une erreur est survenue.");
    } finally {
      setPending(false);
    }
  };

  // Handle Delete Sanction Type
  const handleDeleteType = async (id: string, name: string) => {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer le type "${name}" ? Cela supprimera également toutes les sanctions de ce type déjà attribuées.`
      )
    ) {
      return;
    }

    try {
      const res = await deleteSanctionType(id);
      if (res.ok) {
        setTypes(types.filter((t) => t.id !== id));
        // Remove sanctions that had this type
        setSanctions(sanctions.filter((s) => s.sanctionTypeId !== id));
      }
    } catch (err: any) {
      alert(err.message || "Impossible de supprimer ce type.");
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

  const openEditTypeModal = (type: SanctionType) => {
    setEditingType(type);
    setTypeModalOpen(true);
  };

  const openCreateTypeModal = () => {
    setEditingType(null);
    setTypeModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Navigation tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setTab("issued")}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition border-b-2 -mb-[2px] ${
            tab === "issued"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Sanctions Émises
        </button>
        <button
          onClick={() => setTab("config")}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition border-b-2 -mb-[2px] ${
            tab === "config"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Configuration des Sanctions
        </button>
      </div>

      {/* SEARCH AND FILTERS (Tab: Issued) */}
      {tab === "issued" && (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un élève, motif..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition"
            >
              <option value="">Toutes les classes</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setAssignModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition active:scale-95 w-full sm:w-auto justify-center"
          >
            <Plus className="h-4 w-4" /> Attribuer une Sanction
          </button>
        </div>
      )}

      {/* CONFIGURATION OPTIONS (Tab: Config) */}
      {tab === "config" && (
        <div className="flex justify-end bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <button
            onClick={openCreateTypeModal}
            className="flex items-center gap-2 px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition active:scale-95"
          >
            <Plus className="h-4 w-4" /> Créer un Type de Sanction
          </button>
        </div>
      )}

      {/* CONTENT: SANCTIONS EMISES */}
      {tab === "issued" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-widest font-black text-[10px]">
                  <th className="px-6 py-4">Élève</th>
                  <th className="px-6 py-4">Type de Sanction</th>
                  <th className="px-6 py-4">Motif</th>
                  <th className="px-6 py-4">Donné par</th>
                  <th className="px-6 py-4">Date & Durée</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSanctions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest italic">
                      Aucune sanction enregistrée.
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
                          <div className="font-bold text-slate-800">
                            M. / Mme. {s.givenBy.lastName}
                          </div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            {s.givenBy.role === "TEACHER" ? "Professeur" : "Admin"}
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
      )}

      {/* CONTENT: CONFIGURATION DES SANCTIONS */}
      {tab === "config" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {types.length === 0 ? (
            <div className="col-span-full bg-white p-8 rounded-3xl border border-slate-200 text-center text-slate-400 font-bold uppercase tracking-widest italic shadow-sm">
              Aucun type de sanction configuré.
            </div>
          ) : (
            types.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">
                      {t.name}
                    </h3>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => openEditTypeModal(t)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-100 rounded-lg transition"
                        title="Modifier"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteType(t.id, t.name)}
                        className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-100 rounded-lg transition"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-slate-500 text-xs mt-3 leading-relaxed font-medium">
                    {t.description || "Aucune description fournie."}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-4 mt-4 flex items-center justify-between gap-4">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Attribuable par :
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {t.allowAdmin && (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-widest">
                        Admins
                      </span>
                    )}
                    {t.allowTeacher && (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-widest">
                        Profs
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* DIALOG: TYPE CONFIG MODAL */}
      <dialog
        ref={typeDialogRef}
        onClose={() => setTypeModalOpen(false)}
        className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100%-2rem)] w-[min(100%-2rem,26rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-900/40"
        onCancel={(e) => {
          e.preventDefault();
          setTypeModalOpen(false);
        }}
      >
        <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-950">
              {editingType ? "Modifier le type de sanction" : "Nouveau type de sanction"}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
              Configuration des droits disciplinaires
            </p>
          </div>
          <button
            onClick={() => setTypeModalOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[70vh]">
          {typeError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {typeError}
            </div>
          )}

          <form onSubmit={handleTypeSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                Nom du type de sanction *
              </label>
              <input
                type="text"
                name="name"
                defaultValue={editingType?.name || ""}
                placeholder="Ex: Heure de colle, Avertissement..."
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                Description (Optionnel)
              </label>
              <textarea
                name="description"
                defaultValue={editingType?.description || ""}
                placeholder="Explication ou règlement lié..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition resize-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                Rôles habilités à l'attribuer
              </label>
              <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="allowAdmin"
                    value="true"
                    defaultChecked={editingType ? editingType.allowAdmin : true}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Administrateurs</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                      Droits complets de gestion de cette sanction
                    </p>
                  </div>
                </label>

                <div className="border-t border-slate-200/60 my-2"></div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="allowTeacher"
                    value="true"
                    defaultChecked={editingType ? editingType.allowTeacher : false}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Professeurs / Enseignants</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                      Permet aux profs d'affecter cette sanction via leur espace
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
              <button
                type="button"
                onClick={() => setTypeModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider text-slate-700 transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={pending}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-wider text-white transition disabled:opacity-50"
              >
                {pending ? "Chargement..." : editingType ? "Enregistrer" : "Créer"}
              </button>
            </div>
          </form>
        </div>
      </dialog>

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
              Affectation disciplinaire à un élève
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
                {types
                  .filter((t) => t.allowAdmin) // Admins can assign all types where allowAdmin is true
                  .map((t) => (
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
