"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { 
  Search, 
  Filter, 
  Users, 
  Briefcase, 
  Phone, 
  Mail, 
  UserCheck, 
  X, 
  RotateCcw,
  Building2,
  GraduationCap
} from "lucide-react";

export type StudentRecapRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  class: { id: string; name: string } | null;
  responsibles: Array<{
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  }>;
  studentContracts: Array<{
    companyName: string;
    tutor: {
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      phone: string | null;
    };
  }>;
};

type Props = {
  initialStudents: StudentRecapRow[];
  classes: Array<{ id: string; name: string }>;
};

export default function RecapClient({ initialStudents, classes }: Props) {
  const [search, setSearch] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [contractFilter, setContractFilter] = useState<"all" | "with_contract" | "no_contract">("all");
  const [responsibleFilter, setResponsibleFilter] = useState<"all" | "with_resp" | "no_resp">("all");

  const filteredStudents = useMemo(() => {
    return initialStudents.filter((s) => {
      // 1. Filtre par classe
      if (selectedClassId !== "all") {
        if (selectedClassId === "none") {
          if (s.class) return false;
        } else {
          if (s.class?.id !== selectedClassId) return false;
        }
      }

      // 2. Filtre par contrat d'alternance / entreprise
      if (contractFilter === "with_contract" && s.studentContracts.length === 0) return false;
      if (contractFilter === "no_contract" && s.studentContracts.length > 0) return false;

      // 3. Filtre par responsable légal
      if (responsibleFilter === "with_resp" && s.responsibles.length === 0) return false;
      if (responsibleFilter === "no_resp" && s.responsibles.length > 0) return false;

      // 4. Recherche textuelle
      if (search.trim()) {
        const q = search.toLowerCase();
        const studentMatch = 
          (s.firstName?.toLowerCase().includes(q)) ||
          (s.lastName?.toLowerCase().includes(q)) ||
          (s.email?.toLowerCase().includes(q)) ||
          (s.phone?.toLowerCase().includes(q)) ||
          (s.class?.name?.toLowerCase().includes(q));

        if (studentMatch) return true;

        const respMatch = s.responsibles.some((r) => 
          (r.firstName?.toLowerCase().includes(q)) ||
          (r.lastName?.toLowerCase().includes(q)) ||
          (r.email?.toLowerCase().includes(q)) ||
          (r.phone?.toLowerCase().includes(q))
        );
        if (respMatch) return true;

        const contractMatch = s.studentContracts.some((c) =>
          (c.companyName?.toLowerCase().includes(q)) ||
          (c.tutor.firstName?.toLowerCase().includes(q)) ||
          (c.tutor.lastName?.toLowerCase().includes(q)) ||
          (c.tutor.email?.toLowerCase().includes(q)) ||
          (c.tutor.phone?.toLowerCase().includes(q))
        );
        if (contractMatch) return true;

        return false;
      }

      return true;
    });
  }, [initialStudents, search, selectedClassId, contractFilter, responsibleFilter]);

  const hasActiveFilters = 
    search.trim() !== "" || 
    selectedClassId !== "all" || 
    contractFilter !== "all" || 
    responsibleFilter !== "all";

  const handleResetFilters = () => {
    setSearch("");
    setSelectedClassId("all");
    setContractFilter("all");
    setResponsibleFilter("all");
  };

  const stats = useMemo(() => {
    const total = initialStudents.length;
    const withContract = initialStudents.filter((s) => s.studentContracts.length > 0).length;
    const withResp = initialStudents.filter((s) => s.responsibles.length > 0).length;
    return { total, withContract, withResp };
  }, [initialStudents]);

  return (
    <div className="space-y-6">
      {/* BARRE DE FILTRES */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Filter className="h-4 w-4" />
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Filtres du récapitulatif
            </h2>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Réinitialiser les filtres
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-12">
          {/* Recherche textuelle */}
          <div className="sm:col-span-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Recherche globale
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Nom, prénom, email, téléphone, entreprise..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-xs"
              />
              {search && (
                <button 
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filtre Classe */}
          <div className="sm:col-span-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Classe
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-xs"
            >
              <option value="all">Toutes les classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="none">Sans classe</option>
            </select>
          </div>

          {/* Filtre Alternance / Contrat */}
          <div className="sm:col-span-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Alternance / Contrat
            </label>
            <select
              value={contractFilter}
              onChange={(e) => setContractFilter(e.target.value as any)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-xs"
            >
              <option value="all">Tous (avec ou sans contrat)</option>
              <option value="with_contract">Avec alternance / tuteur</option>
              <option value="no_contract">Sans contrat d'alternance</option>
            </select>
          </div>

          {/* Filtre Responsable */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Responsables
            </label>
            <select
              value={responsibleFilter}
              onChange={(e) => setResponsibleFilter(e.target.value as any)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-xs"
            >
              <option value="all">Tous</option>
              <option value="with_resp">Avec responsable</option>
              <option value="no_resp">Sans responsable</option>
            </select>
          </div>
        </div>

        {/* Compteurs / badges informatifs */}
        <div className="pt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
          <span className="bg-slate-100 px-3 py-1 rounded-lg text-slate-700">
            Affichés : <strong className="text-slate-900">{filteredStudents.length}</strong> / {stats.total}
          </span>
          <span className="text-slate-400">•</span>
          <span>
            Avec alternance : <strong className="text-slate-800">{stats.withContract}</strong>
          </span>
          <span className="text-slate-400">•</span>
          <span>
            Avec responsables : <strong className="text-slate-800">{stats.withResp}</strong>
          </span>
        </div>
      </div>

      {/* TABLEAU RÉCAPITULATIF */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-900 text-white uppercase tracking-widest text-[10px]">
              <tr>
                <th className="px-6 py-5 font-black">Élève & Coordonnées</th>
                <th className="px-6 py-5 font-black">Parents / Responsables Légaux</th>
                <th className="px-6 py-5 font-black">Employeur & Tuteur en entreprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-16 text-center text-slate-400 font-medium italic">
                    Aucun élève ne correspond aux critères de filtre.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition">
                    {/* Colonne 1 : Élève */}
                    <td className="px-6 py-6 align-top">
                      <div className="font-bold text-slate-900 text-base">
                        {s.lastName} {s.firstName}
                      </div>
                      <div className="mt-1">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-100">
                          {s.class?.name || "Sans classe"}
                        </span>
                      </div>

                      <div className="mt-2.5 space-y-1">
                        {s.email && (
                          <div className="text-xs text-slate-500 flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <a href={`mailto:${s.email}`} className="hover:underline text-slate-600">
                              {s.email}
                            </a>
                          </div>
                        )}

                        {/* Numéro de téléphone pour chaque utilisateur */}
                        <div className="text-xs font-mono flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                          {s.phone ? (
                            <a href={`tel:${s.phone}`} className="font-bold text-slate-800 hover:text-blue-600">
                              {s.phone}
                            </a>
                          ) : (
                            <span className="text-slate-400 italic text-[11px] font-sans">Tél: Non renseigné</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Colonne 2 : Parents / Responsables */}
                    <td className="px-6 py-6 align-top">
                      {s.responsibles.length > 0 ? (
                        <ul className="space-y-4">
                          {s.responsibles.map((r, i) => (
                            <li key={i} className="group bg-slate-50/60 p-3 rounded-2xl border border-slate-100">
                              <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                <UserCheck className="h-4 w-4 text-amber-600 shrink-0" />
                                <span>{r.firstName} {r.lastName}</span>
                              </div>
                              <div className="mt-1.5 space-y-1 pl-5 text-xs">
                                {r.email && (
                                  <div className="text-slate-500 flex items-center gap-1.5">
                                    <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                                    <a href={`mailto:${r.email}`} className="hover:underline">
                                      {r.email}
                                    </a>
                                  </div>
                                )}
                                <div className="font-mono flex items-center gap-1.5">
                                  <Phone className="h-3 w-3 text-sky-600 shrink-0" />
                                  {r.phone ? (
                                    <a href={`tel:${r.phone}`} className="font-bold text-slate-800 hover:text-blue-600">
                                      {r.phone}
                                    </a>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px] font-sans">Tél: Non renseigné</span>
                                  )}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Aucun responsable légal lié</span>
                      )}
                    </td>

                    {/* Colonne 3 : Employeur / Tuteur */}
                    <td className="px-6 py-6 align-top">
                      {s.studentContracts.length > 0 ? (
                        <ul className="space-y-4">
                          {s.studentContracts.map((c, i) => (
                            <li key={i} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                              <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5" />
                                <span>{c.companyName}</span>
                              </div>
                              <div className="font-bold text-slate-900 text-sm">
                                Tuteur : {c.tutor.firstName} {c.tutor.lastName}
                              </div>
                              <div className="mt-1.5 space-y-1 text-xs">
                                {c.tutor.email && (
                                  <div className="text-slate-500 flex items-center gap-1.5">
                                    <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                                    <a href={`mailto:${c.tutor.email}`} className="hover:underline">
                                      {c.tutor.email}
                                    </a>
                                  </div>
                                )}
                                <div className="font-mono flex items-center gap-1.5">
                                  <Phone className="h-3 w-3 text-sky-600 shrink-0" />
                                  {c.tutor.phone ? (
                                    <a href={`tel:${c.tutor.phone}`} className="font-bold text-slate-800 hover:text-blue-600">
                                      {c.tutor.phone}
                                    </a>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px] font-sans">Tél: Non renseigné</span>
                                  )}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Aucun contrat d'alternance</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
