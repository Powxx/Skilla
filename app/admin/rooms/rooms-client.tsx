"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RoomsClient({ initialRooms }: { initialRooms: any[] }) {
  const router = useRouter();
  const [rooms, setRooms] = useState(initialRooms);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", capacity: "" });

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const newRoom = await res.json();
        setRooms([...rooms, newRoom].sort((a, b) => a.name.localeCompare(b.name)));
        setFormData({ name: "", capacity: "" });
        router.refresh();
      } else {
        alert("Erreur lors de la création.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette salle ?")) return;
    try {
      const res = await fetch(`/api/rooms?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setRooms(rooms.filter(r => r.id !== id));
        router.refresh();
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="grid gap-8 md:grid-cols-3">
      {/* Form */}
      <div className="md:col-span-1">
        <form onSubmit={handleAddRoom} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.04]">
          <h2 className="text-lg font-medium text-slate-800 mb-4">Nouvelle salle</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom ou Numéro</label>
              <input 
                type="text" 
                required 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="Ex: Salle A102"
                className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Capacité (optionnel)</label>
              <input 
                type="number" 
                min="1"
                value={formData.capacity} 
                onChange={e => setFormData({...formData, capacity: e.target.value})} 
                placeholder="Ex: 30"
                className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Création..." : "Créer la salle"}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="md:col-span-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90">
                <th className="px-5 py-3.5 font-semibold text-slate-700">Nom</th>
                <th className="px-5 py-3.5 font-semibold text-slate-700">Capacité</th>
                <th className="px-5 py-3.5 font-semibold text-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rooms.length === 0 ? (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-500">Aucune salle configurée.</td></tr>
              ) : rooms.map((room) => (
                <tr key={room.id} className="transition hover:bg-slate-50/80">
                  <td className="px-5 py-4 font-medium text-slate-900">{room.name}</td>
                  <td className="px-5 py-4 text-slate-600">{room.capacity ? `${room.capacity} places` : "-"}</td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => handleDelete(room.id)} className="text-red-600 hover:text-red-800 font-medium text-xs bg-red-50 hover:bg-red-100 px-2 py-1 rounded">Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
