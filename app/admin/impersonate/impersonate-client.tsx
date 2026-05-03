"use client";

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';

interface ImpersonateClientProps {
  users: { id: string; firstName: string | null; lastName: string | null; email: string | null; role: string }[];
}

export default function ImpersonateClient({ users }: ImpersonateClientProps) {
  const { update } = useSession();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleImpersonate = async (user: any) => {
    setLoadingId(user.id);
    try {
      await update({
        impersonateUser: {
          id: user.id,
          role: user.role
        }
      });
      
      // Redirect based on role
      switch (user.role) {
        case "TEACHER": window.location.href = "/prof"; break;
        case "STUDENT": window.location.href = "/student"; break;
        case "RESPONSIBLE": window.location.href = "/parent"; break;
        case "COMPANY_TUTOR": window.location.href = "/employer"; break;
        default: window.location.href = "/";
      }
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'impersonnalisation");
      setLoadingId(null);
    }
  };

  return (
    <ul className="divide-y divide-slate-100">
      {users.map(user => (
        <li key={user.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition">
          <div>
            <div className="font-medium text-slate-900">{user.lastName} {user.firstName}</div>
            <div className="text-sm text-slate-500">{user.email} <span className="mx-2">•</span> <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">{user.role}</span></div>
          </div>
          <button 
            onClick={() => handleImpersonate(user)}
            disabled={loadingId !== null}
            className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
          >
            {loadingId === user.id ? "Connexion..." : "Se connecter"}
          </button>
        </li>
      ))}
      {users.length === 0 && (
        <li className="p-8 text-center text-slate-500">Aucun utilisateur trouvé.</li>
      )}
    </ul>
  );
}
