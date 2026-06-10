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

import WeeklyCalendar from "@/components/WeeklyCalendar";

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

  // Convert AI results to Calendar events
  const calendarEvents = result?.scheduledLessons.map((lesson: any) => ({
    title: lesson.subjectName,
    start: lesson.startTime,
    end: lesson.endTime,
    backgroundColor: '#3b82f6',
    extendedProps: {
      teacher: lesson.teacherName,
      room: lesson.roomName,
      classId: lesson.classId
    }
  })) || [];

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        
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
              <p className="text-sm font-medium text-slate-500 italic">Visualisez et ajustez votre planning avant de le valider.</p>
           </div>
           
           <div className="flex gap-3 w-full md:w-auto">
             {result && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 md:flex-none px-6 py-4 bg-emerald-500 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-200 flex items-center justify-center gap-3 disabled:opacity-30 active:scale-95"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Action..." : "Appliquer ce planning"}
                </button>
             )}
             <button
               onClick={handleOptimize}
               disabled={isOptimizing || selectedClassIds.length === 0}
               className="flex-1 md:flex-none px-8 py-4 bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-30 active:scale-95"
             >
               {isOptimizing ? <RotateCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
               {isOptimizing ? "Optimisation..." : "Lancer la Génération"}
             </button>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
           
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
                             <span className="text-[10px] font-black uppercase">Combiner les classes</span>
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
                             <span className="text-[10px] font-black uppercase">Journées Complètes</span>
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
                             <span className="text-[10px] font-black uppercase">Max d'affilé</span>
                          </div>
                          <div className="grid grid-cols-4 gap-1">
                             {[2,3,4,5].map(n => (
                               <button 
                                 key={n}
                                 onClick={() => setMaxConsecutiveLessons(n)}
                                 className={`h-8 rounded-lg text-[9px] font-black transition-all ${maxConsecutiveLessons === n ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}
                               >
                                 {n}B
                               </button>
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>
              </section>

              {/* Class Selection */}
              <section className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                 <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                    <Users className="h-4 w-4" />
                    Cibler les classes
                 </div>
                 
                 <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                    {classes.map(cl => (
                       <div key={cl.id} className="p-2 rounded-xl border border-slate-50 hover:border-blue-100 transition-all">
                          <label className="flex items-center gap-3 cursor-pointer">
                             <input 
                               type="checkbox" 
                               checked={selectedClassIds.includes(cl.id)}
                               onChange={e => {
                                 if (e.target.checked) setSelectedClassIds([...selectedClassIds, cl.id]);
                                 else setSelectedClassIds(selectedClassIds.filter(id => id !== cl.id));
                               }}
                               className="rounded-lg h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                             />
                             <span className="text-[10px] font-black text-slate-600 uppercase">{cl.name}</span>
                          </label>
                       </div>
                    ))}
                 </div>
              </section>
           </div>

           {/* Right Column: Calendar Preview */}
           <div className="lg:col-span-3">
              {!result && !isOptimizing && (
                 <div className="h-full min-h-[600px] flex flex-col items-center justify-center bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200 p-12 text-center">
                    <div className="h-20 w-20 rounded-3xl bg-white shadow-xl flex items-center justify-center text-slate-200 mb-6">
                       <Cpu className="h-10 w-10" />
                    </div>
                    <h3 className="text-lg font-black uppercase text-slate-400 tracking-widest">En attente de paramètres</h3>
                    <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto">Configurez vos contraintes à gauche et lancez l'optimisation pour visualiser le planning.</p>
                 </div>
              )}

              {isOptimizing && (
                 <div className="h-full min-h-[600px] flex flex-col items-center justify-center bg-white rounded-[3rem] border border-slate-200 p-12 text-center shadow-xl">
                    <div className="relative h-24 w-24 mb-8">
                       <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20"></div>
                       <div className="relative h-24 w-24 bg-blue-50 rounded-full flex items-center justify-center">
                          <RotateCw className="h-10 w-10 text-blue-600 animate-spin" />
                       </div>
                    </div>
                    <h3 className="text-xl font-black uppercase text-slate-900 tracking-[0.2em]">IA en pleine réflexion...</h3>
                    <p className="text-sm text-slate-500 mt-4 animate-pulse uppercase font-black tracking-tighter">Exploration des meilleures combinaisons prof/salle</p>
                 </div>
              )}

              {result && (
                 <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                    {/* Compact Stats */}
                    <div className="grid grid-cols-3 gap-4">
                       <div className="bg-emerald-500 p-4 rounded-2xl text-white shadow-lg shadow-emerald-500/20 flex items-center justify-between">
                          <div>
                             <p className="text-xl font-black">{result.scheduledLessons.length}</p>
                             <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Cours placés</p>
                          </div>
                          <CheckCircle2 className="h-5 w-5 opacity-40" />
                       </div>
                       <div className="bg-slate-900 p-4 rounded-2xl text-white shadow-lg shadow-slate-900/20 flex items-center justify-between">
                          <div>
                             <p className="text-xl font-black">{result.unscheduledLessons.length}</p>
                             <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Échecs</p>
                          </div>
                          <AlertCircle className={`h-5 w-5 ${result.unscheduledLessons.length > 0 ? 'text-amber-500' : 'opacity-40'}`} />
                       </div>
                       <div className="bg-blue-600 p-4 rounded-2xl text-white shadow-lg shadow-blue-600/20 flex items-center justify-between">
                          <div>
                             <p className="text-xl font-black">{Math.round(result.score * 100)}%</p>
                             <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Optimisation</p>
                          </div>
                          <RotateCw className="h-5 w-5 opacity-40" />
                       </div>
                    </div>

                    {/* Calendar Component */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden min-h-[700px]">
                        <WeeklyCalendar 
                          events={calendarEvents} 
                          onDateChange={() => {}} 
                        />
                    </div>

                    {result.unscheduledLessons.length > 0 && (
                       <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-4 flex items-center gap-2">
                             <AlertCircle className="h-4 w-4" />
                             Difficultés de placement
                          </h4>
                          <div className="grid gap-2 grid-cols-2">
                             {result.unscheduledLessons.slice(0, 4).map((u: any, i: number) => (
                                <div key={i} className="text-[9px] font-bold p-3 bg-white rounded-xl border border-amber-200 text-amber-900 uppercase">
                                   Sujet {u.subjectId} : {u.reason}
                                </div>
                             ))}
                          </div>
                       </div>
                    )}
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}

