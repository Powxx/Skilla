"use client";

import React, { useState } from 'react';
import PlanningClient from "@/components/planning-client";

interface AdminPlanningClientProps {
  classes: { id: string; name: string }[];
  teachers: { id: string; firstName: string | null; lastName: string | null }[];
  subjects: { id: string; name: string }[];
}

export default function AdminPlanningClient({ classes, teachers, subjects }: AdminPlanningClientProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    subjectId: "",
    teacherId: "",
    classId: "",
    startTime: "",
    endTime: ""
  });
  const [loading, setLoading] = useState(false);

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setShowAddModal(false);
        // Reset form slightly but keep context if wanted
        setFormData({ ...formData, startTime: "", endTime: "" });
        // Hard refresh or state refresh to trigger re-fetch in PlanningClient
        window.location.reload(); 
      } else {
        alert("Erreur lors de l'ajout du cours.");
      }
    } catch (error) {
      console.error(error);
      alert("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Filtrer par Classe</label>
          <select 
            className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setSelectedTeacherId(""); // Reset the other filter
            }}
          >
            <option value="">-- Toutes les classes (non supporté par défaut) --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Ou Filtrer par Professeur</label>
          <select 
            className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={selectedTeacherId}
            onChange={(e) => {
              setSelectedTeacherId(e.target.value);
              setSelectedClassId(""); // Reset the other filter
            }}
          >
            <option value="">-- Aucun --</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.lastName} {t.firstName}</option>)}
          </select>
        </div>
        <div className="flex-shrink-0">
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700"
          >
            + Affecter un cours
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04]">
        {selectedClassId || selectedTeacherId ? (
          <PlanningClient 
            classId={selectedClassId || undefined} 
            teacherId={selectedTeacherId || undefined} 
          />
        ) : (
          <div className="py-20 text-center text-slate-500">
            Sélectionnez une classe ou un professeur pour afficher le planning.
          </div>
        )}
      </div>

      {/* Add Lesson Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800">Affecter un cours</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <form onSubmit={handleAddLesson} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Matière</label>
                <select required value={formData.subjectId} onChange={e => setFormData({...formData, subjectId: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                  <option value="">-- Choisir --</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Professeur</label>
                <select required value={formData.teacherId} onChange={e => setFormData({...formData, teacherId: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                  <option value="">-- Choisir --</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.lastName} {t.firstName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Classe</label>
                <select required value={formData.classId} onChange={e => setFormData({...formData, classId: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                  <option value="">-- Choisir --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Début</label>
                  <input type="datetime-local" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fin</label>
                  <input type="datetime-local" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Annuler</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
