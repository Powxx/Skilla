"use client";

import { useState } from "react";
import { runOptimization, saveOptimizedSchedule } from "@/app/actions/ai-planning";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

export default function AIOptimizerPage() {
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      const data = await runOptimization(new Date(startDate));
      setResult(data);
    } catch (error) {
      alert("Erreur lors de l'optimisation");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setIsSaving(true);
    try {
      await saveOptimizedSchedule(result.scheduledLessons);
      alert("Planning enregistré avec succès !");
      setResult(null);
    } catch (error) {
      alert("Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/admin/planning" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
          &larr; Retour au planning
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 mb-8 flex items-center gap-3">
          <span className="p-2 bg-blue-600 rounded-lg text-white">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.456-2.455l.258-1.036.259 1.036a3.375 3.375 0 002.455 2.456l1.035.258-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </span>
          Optimiseur d'Emploi du Temps par IA
        </h1>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Semaine de début</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button
              onClick={handleOptimize}
              disabled={isOptimizing}
              className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {isOptimizing ? "Optimisation en cours..." : "Lancer l'Optimisation"}
            </button>
          </div>
        </div>

        {result && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <p className="text-sm text-emerald-600 font-medium">Cours placés</p>
                <p className="text-2xl font-bold text-emerald-900">{result.scheduledLessons.length}</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                <p className="text-sm text-amber-600 font-medium">Non placés</p>
                <p className="text-2xl font-bold text-amber-900">{result.unscheduledLessons.length}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-600 font-medium">Score d'optimisation</p>
                <p className="text-2xl font-bold text-blue-900">{Math.round(result.score * 100)}%</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="font-bold text-slate-900">Aperçu du planning généré</h2>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  {isSaving ? "Enregistrement..." : "Appliquer ce planning"}
                </button>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 font-medium">Date & Heure</th>
                      <th className="px-4 py-2 font-medium">Matière</th>
                      <th className="px-4 py-2 font-medium">Professeur</th>
                      <th className="px-4 py-2 font-medium">Salle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {result.scheduledLessons.map((lesson: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          {format(new Date(lesson.startTime), "EEEE dd MMMM", { locale: fr })}
                          <br />
                          <span className="text-xs text-slate-400">
                            {format(new Date(lesson.startTime), "HH:mm")} - {format(new Date(lesson.endTime), "HH:mm")}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">{lesson.subjectName}</td>
                        <td className="px-4 py-3 text-slate-600">{lesson.teacherName}</td>
                        <td className="px-4 py-3 text-slate-600">{lesson.roomName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {result.unscheduledLessons.length > 0 && (
              <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                <h3 className="font-bold text-red-900 mb-2">Échecs de placement</h3>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {result.unscheduledLessons.slice(0, 5).map((u: any, i: number) => (
                    <li key={i}>Besoins pour sujet {u.subjectId} : {u.reason}</li>
                  ))}
                  {result.unscheduledLessons.length > 5 && (
                    <li className="list-none italic">Et {result.unscheduledLessons.length - 5} autres...</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
