"use client";

import React, { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Search, ShieldAlert, UserCheck, Users, GraduationCap, BookOpen, HeartHandshake, Building2, Eye } from 'lucide-react';

interface ImpersonateClientProps {
  users: { id: string; firstName: string | null; lastName: string | null; email: string | null; role: string }[];
}

const ROLE_CONFIG: Record<string, { label: string; badge: string; icon: any }> = {
  SUPER_ADMIN: { label: "Super Admin", badge: "bg-red-50 text-red-700 border-red-200", icon: ShieldAlert },
  ADMIN: { label: "Admin", badge: "bg-violet-50 text-violet-700 border-violet-200", icon: ShieldAlert },
  TEACHER: { label: "Professeur", badge: "bg-sky-50 text-sky-700 border-sky-200", icon: BookOpen },
  STUDENT: { label: "Élève", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: GraduationCap },
  RESPONSIBLE: { label: "Parent", badge: "bg-amber-50 text-amber-800 border-amber-200", icon: HeartHandshake },
  COMPANY_TUTOR: { label: "Tuteur Entreprise", badge: "bg-yellow-50 text-yellow-800 border-yellow-200", icon: Building2 },
};

export default function ImpersonateClient({ users }: ImpersonateClientProps) {
  const { update } = useSession();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Filtre par rôle
      if (selectedRole !== "ALL" && user.role !== selectedRole) {
        return false;
      }

      // Recherche textuelle
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase().trim();
        const fullName = `${user.lastName || ''} ${user.firstName || ''}`.toLowerCase();
        const email = (user.email || "").toLowerCase();
        return fullName.includes(search) || email.includes(search);
      }

      return true;
    });
  }, [users, searchTerm, selectedRole]);

  const handleImpersonate = async (user: any) => {
    setLoadingId(user.id);
    try {
      await update({
        impersonateUser: {
          id: user.id,
          role: user.role,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim()
        }
      });
      
      const destination = 
        user.role === "SUPER_ADMIN" || user.role === "ADMIN" ? "/admin" :
        user.role === "TEACHER" ? "/prof" :
        user.role === "STUDENT" ? "/student" :
        user.role === "RESPONSIBLE" ? "/parent" :
        user.role === "COMPANY_TUTOR" ? "/employer" : "/";
      
      window.location.href = destination;
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'impersonnalisation");
      setLoadingId(null);
    }
  };

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: users.length };
    for (const u of users) {
      counts[u.role] = (counts[u.role] || 0) + 1;
    }
    return counts;
  }, [users]);

  return (
    <div className="flex flex-col">
      {/* Barre de filtre et recherche */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, prénom ou email..."
            className="w-full h-11 pl-10 pr-4 rounded-2xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition shadow-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filtre par rôle */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedRole("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedRole === "ALL" 
                ? "bg-slate-900 text-white shadow-xs" 
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            Tous ({roleCounts.ALL})
          </button>
          {Object.entries(ROLE_CONFIG).map(([roleKey, cfg]) => {
            const count = roleCounts[roleKey] || 0;
            if (count === 0) return null;
            return (
              <button
                key={roleKey}
                onClick={() => setSelectedRole(roleKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedRole === roleKey 
                    ? "bg-slate-900 text-white shadow-xs" 
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span>{cfg.label}</span>
                <span className="opacity-70 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Liste des utilisateurs avec bouton S'impersonnaliser */}
      <ul className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
        {filteredUsers.map(user => {
          const cfg = ROLE_CONFIG[user.role] || { label: user.role, badge: "bg-slate-100 text-slate-800 border-slate-200", icon: Users };
          const Icon = cfg.icon;

          return (
            <li key={user.id} className="flex items-center justify-between p-4 px-6 hover:bg-slate-50/70 transition">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-10 w-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                  {user.firstName?.[0] || ""}{user.lastName?.[0] || ""}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span className="truncate">{user.lastName} {user.firstName}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.badge} shrink-0`}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 truncate mt-0.5">
                    {user.email || "Sans email"}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleImpersonate(user)}
                disabled={loadingId !== null}
                className="ml-4 px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-600 hover:text-white transition disabled:opacity-50 min-w-[130px] flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
              >
                {loadingId === user.id ? (
                  <>
                    <div className="animate-spin h-3.5 w-3.5 border-2 border-blue-600 border-t-transparent rounded-full" />
                    <span>Connexion...</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    <span>Prendre le rôle</span>
                  </>
                )}
              </button>
            </li>
          );
        })}
        {filteredUsers.length === 0 && (
          <li className="p-12 text-center text-slate-400 italic text-sm">
            {searchTerm ? "Aucun utilisateur ne correspond à votre recherche." : "Aucun utilisateur trouvé."}
          </li>
        )}
      </ul>
    </div>
  );
}
