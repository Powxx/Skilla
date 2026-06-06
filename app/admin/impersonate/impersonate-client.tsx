"use client";

import React, { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';

interface ImpersonateClientProps {
  users: { id: string; firstName: string | null; lastName: string | null; email: string | null; role: string }[];
}

export default function ImpersonateClient({ users }: ImpersonateClientProps) {
  const { update } = useSession();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    
    const search = searchTerm.toLowerCase().trim();
    return users.filter(user => {
      const fullName = `${user.lastName} ${user.firstName}`.toLowerCase();
      const email = (user.email || "").toLowerCase();
      return fullName.includes(search) || email.includes(search);
    });
  }, [users, searchTerm]);

  const handleImpersonate = async (user: any) => {
    setLoadingId(user.id);
    try {
      await update({
        impersonateUser: {
          id: user.id,
          role: user.role
        }
      });
      
      // Use window.location.assign to avoid immutability issues with .href if strict mode is active
      // or simply set .href which is standard
      const destination = 
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

  return (
    <div className="flex flex-col">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <ul className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
        {filteredUsers.map(user => (
          <li key={user.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition">
            <div>
              <div className="font-medium text-slate-900 uppercase">{user.lastName} <span className="capitalize">{user.firstName}</span></div>
              <div className="text-sm text-slate-500">
                {user.email} 
                <span className="mx-2">•</span> 
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
                  {user.role}
                </span>
              </div>
            </div>
            <button 
              onClick={() => handleImpersonate(user)}
              disabled={loadingId !== null}
              className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 min-w-[110px]"
            >
              {loadingId === user.id ? "Connexion..." : "Se connecter"}
            </button>
          </li>
        ))}
        {filteredUsers.length === 0 && (
          <li className="p-8 text-center text-slate-500">
            {searchTerm ? "Aucun utilisateur ne correspond à votre recherche." : "Aucun utilisateur trouvé."}
          </li>
        )}
      </ul>
    </div>
  );
}
