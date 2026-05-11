"use client";

import { useState } from "react";

type User = { id: string; firstName: string | null; lastName: string | null; email: string | null };

export default function ConnexionDocsClient({ users }: { users: User[] }) {
  const [filter, setFilter] = useState("");

  const downloadFile = (user: User) => {
    const content = `Informations de connexion - Skilla\n\nNom: ${user.lastName || ''} ${user.firstName || ''}\nIdentifiant: ${user.email || 'N/A'}\nLien: skilla.ecm-academie.com\nMot de passe: Veuillez réinitialiser si nécessaire.`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `connexion_${user.lastName || 'user'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filtered = users.filter(u => 
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="bg-white p-6 rounded-xl border shadow-sm">
      <input 
        placeholder="Rechercher un utilisateur..." 
        className="w-full p-2 border rounded-lg mb-4"
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="space-y-2">
        {filtered.map(u => (
          <div key={u.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50">
            <span>{u.lastName} {u.firstName} ({u.email})</span>
            <button 
              onClick={() => downloadFile(u)}
              className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded"
            >
              Télécharger
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
