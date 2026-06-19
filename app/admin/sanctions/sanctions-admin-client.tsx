"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Edit3, Search, ShieldAlert, Clock, AlertTriangle, X, Star, Activity } from "lucide-react";
import {
  createSanctionType, updateSanctionType, deleteSanctionType,
  assignSanction, deleteSanction, updateSanctionStatus,
} from "@/app/actions/sanctions";
import { SanctionStatus } from "@prisma/client";
import { STATUS_LABELS, STATUS_COLORS, EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from "@/lib/sanctions-ui";

type StudentOption = { id: string; name: string; className: string };
type SanctionType = { id: string; name: string; description: string | null; allowTeacher: boolean; allowAdmin: boolean };
type SanctionInstance = {
  id: string; studentId: string;
  student: { id: string; firstName: string; lastName: string; conductPoints: number; class: { id: string; name: string } | null };
  sanctionType: SanctionType; reason: string; duration: string | null;
  date: Date | string; status: SanctionStatus; pointsCost: number;
  givenBy: { id: string; firstName: string; lastName: string; role: string };
};

type ActionEvent = {
  id: string;
  type: string;
  description: string;
  createdAt: Date | string;
  student: { id: string; firstName: string; lastName: string };
  sanction: { sanctionType: { name: string } } | null;
};

type Props = {
  initialSanctions: SanctionInstance[];
  initialTypes: SanctionType[];
  students: StudentOption[];
  pointsEnabled: boolean;
  actionEvents: ActionEvent[];
};

export default function SanctionsAdminClient({ initialSanctions, initialTypes, students, pointsEnabled, actionEvents }: Props) {
  const [tab, setTab] = useState<"issued" | "config">("issued");
  const [sanctions, setSanctions] = useState<SanctionInstance[]>(initialSanctions);
  const [types, setTypes] = useState<SanctionType[]>(initialTypes);
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<SanctionType | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const typeDialogRef = useRef<HTMLDialogElement>(null);
  const assignDialogRef = useRef<HTMLDialogElement>(null);

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

  const classes = Array.from(new Set(students.map((s) => s.className).filter(Boolean)));
  const filteredSanctions = sanctions.filter((s) => {
    const name = `${s.student.lastName} ${s.student.firstName}`.toLowerCase();
    const q = searchQuery.toLowerCase();
    return (name.includes(q) || s.reason.toLowerCase().includes(q) || s.sanctionType.name.toLowerCase().includes(q))
      && (!classFilter || s.student.class?.name === classFilter);
  });

  const handleTypeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setTypeError(null); setPending(true);
    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    const description = fd.get("description") as string;
    const allowTeacher = (e.currentTarget.querySelector('[name="allowTeacher"]') as HTMLInputElement)?.checked ?? false;
    const allowAdmin = (e.currentTarget.querySelector('[name="allowAdmin"]') as HTMLInputElement)?.checked ?? true;
    if (!name.trim()) { setTypeError("Le nom est obligatoire."); setPending(false); return; }
    if (!allowTeacher && !allowAdmin) { setTypeError("Au moins un rôle doit être sélectionné."); setPending(false); return; }
    try {
      if (editingType) {
        const res = await updateSanctionType(editingType.id, { name, description, allowTeacher, allowAdmin });
        if (res.ok) { setTypes(types.map((t) => t.id === editingType.id ? (res.sanctionType as any) : t)); setTypeModalOpen(false); }
      } else {
        const res = await createSanctionType({ name, description, allowTeacher, allowAdmin });
        if (res.ok) { setTypes([...types, res.sanctionType as any].sort((a, b) => a.name.localeCompare(b.name))); setTypeModalOpen(false); }
      }
    } catch (err: any) { setTypeError(err.message); } finally { setPending(false); }
  };

  const handleAssignSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setAssignError(null); setPending(true);
    const fd = new FormData(e.currentTarget);
    const studentId = fd.get("studentId") as string;
    const sanctionTypeId = fd.get("sanctionTypeId") as string;
    const reason = fd.get("reason") as string;
    const duration = fd.get("duration") as string;
    const date = fd.get("date") as string;
    const pointsCost = parseInt(fd.get("pointsCost") as string || "0", 10);
    if (!studentId || !sanctionTypeId || !reason.trim()) { setAssignError("Élève, type et motif sont obligatoires."); setPending(false); return; }
    try {
      await assignSanction({ studentId, sanctionTypeId, reason, duration, date, pointsCost });
      window.location.reload();
    } catch (err: any) { setAssignError(err.message); } finally { setPending(false); }
  };

  const handleStatusChange = async (id: string, status: SanctionStatus) => {
    setSanctions(sanctions.map((s) => s.id === id ? { ...s, status } : s));
    try { await updateSanctionStatus(id, status); } catch { window.location.reload(); }
  };

  const handleDeleteType = async (id: string, name: string) => {
    if (!confirm(`Supprimer le type "${name}" ? Cela supprimera aussi toutes ses sanctions.`)) return;
    try { const res = await deleteSanctionType(id); if (res.ok) { setTypes(types.filter((t) => t.id !== id)); setSanctions(sanctions.filter((s) => s.sanctionType.id !== id)); } }
    catch (err: any) { alert(err.message); }
  };

  const handleDeleteSanction = async (id: string) => {
    if (!confirm("Annuler cette sanction ?")) return;
    try { const res = await deleteSanction(id); if (res.ok) setSanctions(sanctions.filter((s) => s.id !== id)); }
    catch (err: any) { alert(err.message); }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {(["issued", "config"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition border-b-2 -mb-[2px] ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
            {t === "issued" ? "Sanctions Émises" : "Configuration"}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {tab === "issued" ? (
          <>
            <div className="flex gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition" />
              </div>
              <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition">
                <option value="">Toutes les classes</option>
                {classes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={() => setAssignModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition active:scale-95">
              <Plus className="h-4 w-4" /> Attribuer
            </button>
          </>
        ) : (
          <div className="w-full flex justify-end">
            <button onClick={() => { setEditingType(null); setTypeModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition active:scale-95">
              <Plus className="h-4 w-4" /> Créer un type
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      {tab === "issued" && (
        <>
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-widest font-black text-[10px]">
                  <th className="px-5 py-4">Élève{pointsEnabled && " / Pts"}</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Motif</th>
                  <th className="px-5 py-4">Statut</th>
                  <th className="px-5 py-4">Donné par</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSanctions.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold uppercase italic">Aucune sanction.</td></tr>
                ) : filteredSanctions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-4">
                      <div className="font-black text-slate-900">{s.student.lastName} {s.student.firstName}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">{s.student.class?.name || "Sans classe"}</div>
                      {pointsEnabled && (
                        <div className="text-[10px] font-black text-slate-500 mt-0.5 flex items-center gap-1">
                          <Star className="h-2.5 w-2.5 text-amber-400" />{s.student.conductPoints} pts
                          {s.pointsCost > 0 && <span className="text-red-500">(-{s.pointsCost})</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-red-50 text-red-700 border border-red-100">
                        <ShieldAlert className="h-3 w-3" />{s.sanctionType.name}
                      </span>
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <div className="text-slate-700 font-medium truncate">{s.reason}</div>
                      {s.duration && <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{s.duration}</div>}
                    </td>
                    <td className="px-5 py-4">
                      <select value={s.status} onChange={(e) => handleStatusChange(s.id, e.target.value as SanctionStatus)}
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border cursor-pointer focus:outline-none ${STATUS_COLORS[s.status]}`}>
                        {(Object.keys(STATUS_LABELS) as SanctionStatus[]).map((st) => (
                          <option key={st} value={st}>{STATUS_LABELS[st]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800">{s.givenBy.lastName}</div>
                      <div className="text-[9px] text-slate-400 uppercase font-bold">{s.givenBy.role === "TEACHER" ? "Professeur" : "Admin"}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 font-bold text-slate-700">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(s.date).toLocaleDateString("fr-FR")}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => handleDeleteSanction(s.id)}
                        className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-xl transition border border-slate-200">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {pointsEnabled && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-500" />
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Flux d&apos;Événements</h3>
            </div>
            {actionEvents.length === 0 ? (
              <p className="px-6 py-10 text-center text-slate-400 text-xs font-bold uppercase italic">Aucun événement enregistré.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {actionEvents.map((ev) => (
                  <li key={ev.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 hover:bg-slate-50/50 transition">
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${EVENT_TYPE_COLORS[ev.type] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        {EVENT_TYPE_LABELS[ev.type] ?? ev.type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {new Date(ev.createdAt).toLocaleString("fr-FR")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-800">
                        {ev.student.lastName} {ev.student.firstName}
                        {ev.sanction?.sanctionType.name && (
                          <span className="text-slate-400 font-bold ml-2">· {ev.sanction.sanctionType.name}</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">{ev.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        </>
      )}

      {/* Config Cards */}
      {tab === "config" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {types.length === 0 ? (
            <div className="col-span-full bg-white p-8 rounded-3xl border border-slate-200 text-center text-slate-400 italic font-bold uppercase">Aucun type configuré.</div>
          ) : types.map((t) => (
            <div key={t.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">{t.name}</h3>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => { setEditingType(t); setTypeModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-lg transition"><Edit3 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDeleteType(t.id, t.name)} className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 rounded-lg transition"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <p className="text-slate-500 text-xs mt-2 leading-relaxed">{t.description || "Aucune description."}</p>
              </div>
              <div className="border-t border-slate-100 pt-3 mt-4 flex justify-end gap-2">
                {t.allowAdmin && <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase">Admins</span>}
                {t.allowTeacher && <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">Profs</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TYPE MODAL */}
      <dialog ref={typeDialogRef} onClose={() => setTypeModalOpen(false)} onCancel={(e) => { e.preventDefault(); setTypeModalOpen(false); }}
        className="fixed left-1/2 top-1/2 z-50 w-[min(100%-2rem,26rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-900/40">
        <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-950">{editingType ? "Modifier le type" : "Nouveau type de sanction"}</h2>
          <button onClick={() => setTypeModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[70vh]">
          {typeError && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-xl flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{typeError}</div>}
          <form onSubmit={handleTypeSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Nom *</label>
              <input type="text" name="name" defaultValue={editingType?.name || ""} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-500 transition" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Description (optionnel)</label>
              <textarea name="description" defaultValue={editingType?.description || ""} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:border-blue-500 transition" />
            </div>
            <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="allowAdmin" defaultChecked={editingType ? editingType.allowAdmin : true} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                <span className="text-xs font-black text-slate-800 uppercase">Administrateurs</span>
              </label>
              <div className="border-t border-slate-200/60 my-1" />
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="allowTeacher" defaultChecked={editingType ? editingType.allowTeacher : false} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                <span className="text-xs font-black text-slate-800 uppercase">Professeurs</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setTypeModalOpen(false)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase text-slate-700 transition hover:bg-slate-50">Annuler</button>
              <button type="submit" disabled={pending} className="px-4 py-2 bg-slate-950 rounded-xl text-xs font-black uppercase text-white transition hover:bg-slate-800 disabled:opacity-50">{pending ? "Chargement..." : editingType ? "Enregistrer" : "Créer"}</button>
            </div>
          </form>
        </div>
      </dialog>

      {/* ASSIGN MODAL */}
      <dialog ref={assignDialogRef} onClose={() => setAssignModalOpen(false)} onCancel={(e) => { e.preventDefault(); setAssignModalOpen(false); }}
        className="fixed left-1/2 top-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-900/40">
        <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-950">Attribuer une Sanction</h2>
          <button onClick={() => setAssignModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[70vh]">
          {assignError && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-xl flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{assignError}</div>}
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Élève *</label>
              <select name="studentId" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-500 transition">
                <option value="">-- Choisir --</option>
                {students.map((s) => <option key={s.id} value={s.id}>[{s.className}] {s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Type *</label>
              <select name="sanctionTypeId" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-500 transition">
                <option value="">-- Choisir --</option>
                {types.filter((t) => t.allowAdmin).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Date</label>
                <input type="date" name="date" defaultValue={new Date().toISOString().split("T")[0]} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-500 transition" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Durée (optionnel)</label>
                <input type="text" name="duration" placeholder="Ex: 2 heures" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-500 transition" />
              </div>
            </div>
            {pointsEnabled && (
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Points de conduite à retirer</label>
                <input type="number" name="pointsCost" min="0" max="100" defaultValue="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-500 transition" />
              </div>
            )}
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Motif *</label>
              <textarea name="reason" required rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:border-blue-500 transition" />
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setAssignModalOpen(false)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase text-slate-700 hover:bg-slate-50 transition">Annuler</button>
              <button type="submit" disabled={pending} className="px-4 py-2 bg-slate-950 rounded-xl text-xs font-black uppercase text-white hover:bg-slate-800 transition disabled:opacity-50">{pending ? "Création..." : "Attribuer"}</button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  );
}
