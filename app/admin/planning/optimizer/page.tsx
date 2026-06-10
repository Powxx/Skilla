"use client";

import { useState, useEffect } from "react";
import { runOptimization, saveOptimizedSchedule, updateClassCycle } from "@/app/actions/ai-planning";
import { format, addWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { 
  Settings2, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  Users, 
  Clock, 
  Layers, 
  Infinity as InfinityIcon,
  ChevronRight,
  Save,
  Play,
  RotateCw
} from "lucide-react";

export default function AIOptimizerPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  // Params
  const [allowClassCombination, setAllowClassCombination] = useState(false);
  const [allowFullDay, setAllowFullDay] = useState(true);
  const [maxConsecutiveLessons, setMaxConsecutiveLessons] = useState(3);

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/classes").then(res => res.json()).then(setClasses);
  }, []);

  const handleOptimize = async () => {
    if (selectedClassIds.length === 0) {
      alert("Veuillez sélectionner au moins une classe.");
      return;
    }
    setIsOptimizing(true);
    try {
      const data = await runOptimization({
        startDate: new Date(startDate),
        classIds: selectedClassIds,
        allowClassCombination,
        allowFullDay,
        maxConsecutiveLessons
      });
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

  const handleUpdateCycle = async (classId: string, cycle: number) => {
    await updateClassCycle(classId, cycle);
    setClasses(classes.map(c => c.id === classId ? { ...c, cycleWeeks: cycle } : c));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
           <div className="space-y-1">
              <Link href="/admin/planning" className="group flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors">
                <ChevronRight className="h-4 w-4 rotate-180" />
                Retour au planning
              </Link>
              <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 uppercase">
                <Cpu className="h-8 w-8 text-blue-600" />
                Moteur d'Optimisation IA
              </h1>
              <p className="text-sm font-medium text-slate-500 italic">Générez un emploi du temps intelligent basé sur vos contraintes réelles.</p>
           </div>
           
           <button
             onClick={handleOptimize}
             disabled={isOptimizing || selectedClassIds.length === 0}
             className="w-full md:w-auto px-8 py-4 bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-30 active:scale-95"
           >
             {isOptimizing ? <RotateCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
             {isOptimizing ? "Optimisation..." : "Lancer la Génération"}
           </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* Left Column: Config */}
           <div className="lg:col-span-1 space-y-6">
              
              {/* Date & Constraints */}
              <section className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                 <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                    <CalendarIcon className="h-4 w-4" />
                    Période & Paramètres
                 </div>
                 
                 <div className="space-y-4">
                    <div>
                       <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Semaine de début</label>
                       <input 
                         type="date" 
                         value={startDate}
                         onChange={(e) => setStartDate(e.target.value)}
                         className="w-full h-12 px-4 rounded-2xl border-slate-200 text-sm font-bold focus:ring-slate-900"
                       />
                    </div>

                    <div className="space-y-3">
                       <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 cursor-pointer hover:border-blue-200 transition-colors">
                          <div className="flex items-center gap-3">
                             <Layers className="h-5 w-5 text-slate-400" />
                             <span className="text-xs font-black uppercase">Combiner les classes</span>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={allowClassCombination}
                            onChange={e => setAllowClassCombination(e.target.checked)}
                            className="rounded-lg h-5 w-5 text-blue-600 border-slate-300 focus:ring-blue-500"
                          />
                       </label>

                       <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 cursor-pointer hover:border-blue-200 transition-colors">
                          <div className="flex items-center gap-3">
                             <Clock className="h-5 w-5 text-slate-400" />
                             <span className="text-xs font-black uppercase">Journées Complètes Profs</span>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={allowFullDay}
                            onChange={e => setAllowFullDay(e.target.checked)}
                            className="rounded-lg h-5 w-5 text-blue-600 border-slate-300 focus:ring-blue-500"
                          />
                       </label>

                       <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                          <div className="flex items-center gap-3 mb-3">
                             <Settings2 className="h-5 w-5 text-slate-400" />
                             <span className="text-xs font-black uppercase">Cours max d'affilé</span>
                          </div>
                          <div className="flex gap-2">
                             {[2,3,4,5].map(n => (
                               <button 
                                 key={n}
                                 onClick={() => setMaxConsecutiveLessons(n)}
                                 className={`flex-1 h-8 rounded-lg text-[10px] font-black transition-all ${maxConsecutiveLessons === n ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}
                               >
                                 {n} BLOCS
                               </button>
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>
              </section>

              {/* Class Selection & Cycles */}
              <section className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                 <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                    <Users className="h-4 w-4" />
                    Classes & Cycles
                 </div>
                 
                 <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {classes.map(cl => (
                       <div key={cl.id} className="group p-3 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all space-y-3">
                          <div className="flex items-center justify-between">
                             <label className="flex items-center gap-3 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={selectedClassIds.includes(cl.id)}
                                  onChange={e => {
                                    if (e.target.checked) setSelectedClassIds([...selectedClassIds, cl.id]);
                                    else setSelectedClassIds(selectedClassIds.filter(id => id !== cl.id));
                                  }}
                                  className="rounded-lg h-5 w-5 text-blue-600 border-slate-300 focus:ring-blue-500"
                                />
                                <span className="text-xs font-black text-slate-900 uppercase">{cl.name}</span>
                             </label>
                             <div className="flex items-center gap-2">
                                <InfinityIcon className="h-3 w-3 text-slate-300" />
                                <select 
                                  value={cl.cycleWeeks || 1}
                                  onChange={e => handleUpdateCycle(cl.id, parseInt(e.target.value))}
                                  className="text-[10px] font-black uppercase bg-slate-50 border-none rounded-lg py-1 pl-2 pr-6 focus:ring-0"
                                >
                                   <option value="1">1 Sem.</option>
                                   <option value="2">2 Sem.</option>
                                   <option value="4">4 Sem.</option>
                                </select>
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
              </section>
           </div>

           {/* Right Column: Result */}
           <div className="lg:col-span-2">
              {!result && !isOptimizing && (
                 <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200 p-12 text-center">
                    <div className="h-20 w-20 rounded-3xl bg-white shadow-xl flex items-center justify-center text-slate-200 mb-6">
                       <Cpu className="h-10 w-10" />
                    </div>
                    <h3 className="text-lg font-black uppercase text-slate-400 tracking-widest">En attente de paramètres</h3>
                    <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto">Configurez vos contraintes à gauche et lancez l'optimisation pour voir le résultat.</p>
                 </div>
              )}

              {isOptimizing && (
                 <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white rounded-[3rem] border border-slate-200 p-12 text-center">
                    <div className="relative h-24 w-24 mb-8">
                       <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20"></div>
                       <div className="relative h-24 w-24 bg-blue-50 rounded-full flex items-center justify-center">
                          <RotateCw className="h-10 w-10 text-blue-600 animate-spin" />
                       </div>
                    </div>
                    <h3 className="text-xl font-black uppercase text-slate-900 tracking-[0.2em]">Cerveau IA en action...</h3>
                    <p className="text-sm text-slate-500 mt-4 animate-pulse">Calcul de milliers de combinaisons pour trouver le planning idéal.</p>
                 </div>
              )}

              {result && (
                 <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                       <div className="bg-emerald-500 p-6 rounded-[2rem] text-white shadow-lg shadow-emerald-500/20">
                          <CheckCircle2 className="h-6 w-6 opacity-60 mb-4" />
                          <p className="text-2xl font-black tabular-nums leading-none">{result.scheduledLessons.length}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">Cours placés</p>
                       </div>
                       <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-lg shadow-slate-900/20">
                          <AlertCircle className={`h-6 w-6 mb-4 ${result.unscheduledLessons.length > 0 ? 'text-amber-500' : 'opacity-60'}`} />
                          <p className="text-2xl font-black tabular-nums leading-none">{result.unscheduledLessons.length}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">Échecs</p>
                       </div>
                       <div className="bg-blue-600 p-6 rounded-[2rem] text-white shadow-lg shadow-blue-600/20">
                          <RotateCw className="h-6 w-6 opacity-60 mb-4" />
                          <p className="text-2xl font-black tabular-nums leading-none">{Math.round(result.score * 100)}%</p>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">Score Global</p>
                       </div>
                    </div>

                    {/* Preview Table */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
                       <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                          <h2 className="text-xs font-black uppercase tracking-widest text-slate-900">Aperçu du planning généré</h2>
                          <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                          >
                            <Save className="h-4 w-4" />
                            {isSaving ? "Action..." : "Valider & Appliquer"}
                          </button>
                       </div>
                       <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-white text-slate-400 sticky top-0 z-10 border-b border-slate-50">
                              <tr>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Moment</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Classe(s)</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Matière / Prof</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Salle</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {result.scheduledLessons.map((lesson: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                  <td className="px-6 py-4">
                                    <p className="font-black text-slate-900 text-xs uppercase">{format(new Date(lesson.startTime), "EEEE dd", { locale: fr })}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                      {format(new Date(lesson.startTime), "HH:mm")} — {format(new Date(lesson.endTime), "HH:mm")}
                                    </p>
                                  </td>
                                  <td className="px-6 py-4">
                                     <div className="flex flex-wrap gap-1">
                                        {String(lesson.classId).split(',').map((id: string) => (
                                           <span key={id} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[9px] font-black uppercase">
                                              {id.length > 10 ? 'COMBINÉ' : id}
                                           </span>
                                        ))}
                                     </div>
                                  </td>
                                  <td className="px-6 py-4">
                                     <p className="font-black text-slate-900 text-xs uppercase">{lesson.subjectName}</p>
                                     <p className="text-[10px] font-bold text-blue-500 uppercase">{lesson.teacherName}</p>
                                  </td>
                                  <td className="px-6 py-4 font-bold text-slate-400 text-xs uppercase">{lesson.roomName}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                       </div>
                    </div>
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}

