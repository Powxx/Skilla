"use client";

import { useState, useMemo } from "react";
import { Download, FileSpreadsheet, Search, UserCheck, Shield, GraduationCap, Briefcase, Users } from "lucide-react";

export type ConnexionUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  username: string | null;
  role: string;
  class: { id: string; name: string } | null;
};

const ROLE_LABELS: Record<string, { label: string; badge: string }> = {
  STUDENT: { label: "Élève", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  TEACHER: { label: "Enseignant", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  RESPONSIBLE: { label: "Responsable", badge: "bg-purple-50 text-purple-700 border-purple-200" },
  COMPANY_TUTOR: { label: "Tuteur Entreprise", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  ADMIN: { label: "Administrateur", badge: "bg-rose-50 text-rose-700 border-rose-200" },
  SUPER_ADMIN: { label: "Super Admin", badge: "bg-rose-100 text-rose-800 border-rose-300 font-bold" },
};

export default function ConnexionDocsClient({ users }: { users: ConnexionUser[] }) {
  const [filter, setFilter] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole = selectedRole === "ALL" || u.role === selectedRole;
      if (!matchRole) return false;

      const q = filter.trim().toLowerCase();
      if (!q) return true;

      const fullName = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
      const reverseName = `${u.lastName || ""} ${u.firstName || ""}`.toLowerCase();
      const email = (u.email || "").toLowerCase();
      const username = (u.username || "").toLowerCase();
      const className = (u.class?.name || "").toLowerCase();

      return (
        fullName.includes(q) ||
        reverseName.includes(q) ||
        email.includes(q) ||
        username.includes(q) ||
        className.includes(q)
      );
    });
  }, [users, filter, selectedRole]);

  // Téléchargement individuel d'une fiche d'accès (.txt)
  const downloadSingleDoc = (user: ConnexionUser) => {
    const primaryId = user.username || user.email || "Non renseigné";
    const content = [
      "===========================================================",
      "               SKILLA — FICHE D'ACCÈS AU PORTAIL            ",
      "===========================================================",
      "",
      `Nom : ${(user.lastName || "").toUpperCase()}`,
      `Prénom : ${user.firstName || ""}`,
      `Rôle : ${ROLE_LABELS[user.role]?.label || user.role}`,
      `Classe : ${user.class?.name || "Non assignée"}`,
      "",
      "-------------------- VOS IDENTIFIANTS --------------------",
      `Identifiant de connexion : ${primaryId}`,
      `Adresse e-mail : ${user.email || "Aucune (connexion par nom d'utilisateur)"}`,
      "",
      "-------------------- INSTRUCTIONS D'ACCÈS -----------------",
      "1. Rendez-vous sur le portail : https://skilla.ecm-academie.com",
      `2. Saisissez votre identifiant : ${primaryId}`,
      "3. Lors de votre première connexion, utilisez le mot de passe provisoire",
      "   remis par votre secrétariat ou cliquez sur 'Mot de passe oublié'.",
      "",
      "Pour toute assistance technique, veuillez contacter l'administration de l'établissement.",
      "===========================================================",
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const sanitizedName = (user.lastName || "utilisateur").toLowerCase().replace(/[^a-z0-9]/g, "_");
    link.download = `acces_skilla_${sanitizedName}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export groupé en CSV avec encodage UTF-8 BOM pour compatibilité Excel
  const exportCsv = () => {
    if (filteredUsers.length === 0) return;

    const headers = [
      "Nom",
      "Prénom",
      "Rôle",
      "Classe",
      "Identifiant Connexion",
      "Nom d'utilisateur",
      "Email",
      "Portail URL",
    ];

    const rows = filteredUsers.map((u) => [
      `"${(u.lastName || "").replace(/"/g, '""')}"`,
      `"${(u.firstName || "").replace(/"/g, '""')}"`,
      `"${ROLE_LABELS[u.role]?.label || u.role}"`,
      `"${(u.class?.name || "N/A").replace(/"/g, '""')}"`,
      `"${(u.username || u.email || "N/A").replace(/"/g, '""')}"`,
      `"${(u.username || "").replace(/"/g, '""')}"`,
      `"${(u.email || "").replace(/"/g, '""')}"`,
      `"https://skilla.ecm-academie.com"`,
    ]);

    // BOM UTF-8 (\uFEFF) pour garantir l'affichage correct des accents dans Microsoft Excel
    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `identifiants_skilla_${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Barre d'outils et de filtres */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Rechercher par nom, prénom, identifiant, classe..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-700 font-medium cursor-pointer"
          >
            <option value="ALL">Tous les rôles ({users.length})</option>
            <option value="STUDENT">Élèves</option>
            <option value="TEACHER">Enseignants</option>
            <option value="RESPONSIBLE">Responsables</option>
            <option value="COMPANY_TUTOR">Tuteurs entreprise</option>
            <option value="ADMIN">Administrateurs</option>
          </select>
        </div>

        <button
          onClick={exportCsv}
          disabled={filteredUsers.length === 0}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm hover:shadow transition shrink-0"
          title="Exporter la liste filtrée au format Excel / CSV"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Exporter CSV ({filteredUsers.length})</span>
        </button>
      </div>

      {/* Liste des utilisateurs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
          <span>Utilisateurs ({filteredUsers.length})</span>
          <span>Action</span>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Aucun utilisateur ne correspond à votre recherche.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[650px] overflow-y-auto">
            {filteredUsers.map((u) => {
              const primaryLogin = u.username ? `@${u.username}` : u.email || "Non configuré";
              const roleInfo = ROLE_LABELS[u.role] || { label: u.role, badge: "bg-slate-100 text-slate-700 border-slate-200" };

              return (
                <div
                  key={u.id}
                  className="p-4 hover:bg-slate-50/80 transition flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center text-slate-600 font-black text-sm shrink-0">
                      {(u.lastName?.[0] || "U").toUpperCase()}{(u.firstName?.[0] || "").toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">
                          <span className="uppercase">{u.lastName}</span> {u.firstName}
                        </span>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${roleInfo.badge}`}>
                          {roleInfo.label}
                        </span>

                        {u.class && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-indigo-50 text-indigo-700 border-indigo-200">
                            {u.class.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {primaryLogin}
                        </span>
                        {u.username && u.email && (
                          <span className="truncate max-w-[200px] text-slate-400">
                            {u.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => downloadSingleDoc(u)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 text-xs font-bold rounded-lg transition shrink-0"
                    title="Télécharger la fiche d'accès individuelle"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Fiche .txt</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
