"use client";

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { updateNotificationConfig } from '@/app/actions/notifications';
import { updateGlobalSetting, updateTeacherLivretAccess } from '@/app/actions/settings';

import { cleanupOldNotifications } from '@/app/actions/maintenance';

export default function CoreSettingsClient({ 
  initialClasses, 
  initialSubjects, 
  initialSemesters,
  initialNotificationConfigs = [],
  initialHolidays = [],
  globalSettings = {},
  teachers = [],
  initialSchoolYears = []
}: any) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [teacherLoadingMap, setTeacherLoadingMap] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState('classes');

  const [newName, setNewName] = useState('');
  const [newSemester, setNewSemester] = useState({ name: '', start: '', end: '' });
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '' });
  const [newSchoolYear, setNewSchoolYear] = useState({ name: '', start: '', end: '' });
  const [semesterSchoolYearLinks, setSemesterSchoolYearLinks] = useState<Record<string, string>>({});

  // Planning settings
  const [lunchStart, setLunchStart] = useState(globalSettings.LUNCH_START || "12:00");
  const [lunchEnd, setLunchEnd] = useState(globalSettings.LUNCH_END || "13:30");

  const [teacherList, setTeacherList] = useState(teachers);

  // Establishment settings
  const [schoolName, setSchoolName] = useState(globalSettings.SCHOOL_NAME || "");
  const [schoolShortName, setSchoolShortName] = useState(globalSettings.SCHOOL_SHORT_NAME || "");
  const [schoolAddress, setSchoolAddress] = useState(globalSettings.SCHOOL_ADDRESS || "");
  const [schoolPhone, setSchoolPhone] = useState(globalSettings.SCHOOL_PHONE || "");
  const [schoolEmail, setSchoolEmail] = useState(globalSettings.SCHOOL_EMAIL || "");
  const [schoolWebsite, setSchoolWebsite] = useState(globalSettings.SCHOOL_WEBSITE || "");

  // Platform Options
  const [enableArcade, setEnableArcade] = useState(globalSettings.ENABLE_ARCADE !== "false");
  const [enableChat, setEnableChat] = useState(globalSettings.CHAT_ENABLED !== "false");
  const [chatRetentionDays, setChatRetentionDays] = useState(parseInt(globalSettings.CHAT_RETENTION_DAYS || "7", 10));
  const [enableSanctionPoints, setEnableSanctionPoints] = useState(globalSettings.SANCTIONS_POINTS_ENABLED === "true");
  const [enableSanctionComments, setEnableSanctionComments] = useState(globalSettings.SANCTIONS_COMMENTS_ENABLED === "true");
  const [enableQualiopi, setEnableQualiopi] = useState(globalSettings.QUALIOPI_ENABLED !== "false");
  const [enableMeetings, setEnableMeetings] = useState(globalSettings.MEETINGS_ENABLED !== "false");

  // Sync with props
  useEffect(() => {
    setTeacherList(teachers);
    setEnableArcade(globalSettings.ENABLE_ARCADE !== "false");
    setEnableChat(globalSettings.CHAT_ENABLED !== "false");
    setChatRetentionDays(parseInt(globalSettings.CHAT_RETENTION_DAYS || "7", 10));
    setEnableSanctionPoints(globalSettings.SANCTIONS_POINTS_ENABLED === "true");
    setEnableSanctionComments(globalSettings.SANCTIONS_COMMENTS_ENABLED === "true");
    setEnableQualiopi(globalSettings.QUALIOPI_ENABLED !== "false");
    setEnableMeetings(globalSettings.MEETINGS_ENABLED !== "false");
  }, [teachers, globalSettings]);

  const handleUpdateOptions = async (key: string, value: string) => {
    setLoading(true);
    await updateGlobalSetting(key, value);
    setLoading(false);
    router.refresh();
  };

  const handleUpdateLunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await updateGlobalSetting("LUNCH_START", lunchStart);
    await updateGlobalSetting("LUNCH_END", lunchEnd);
    setLoading(false);
    alert("Paramètres de repas mis à jour.");
    router.refresh();
  };

  const handleUpdateEstablishment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await Promise.all([
      updateGlobalSetting("SCHOOL_NAME", schoolName),
      updateGlobalSetting("SCHOOL_SHORT_NAME", schoolShortName),
      updateGlobalSetting("SCHOOL_ADDRESS", schoolAddress),
      updateGlobalSetting("SCHOOL_PHONE", schoolPhone),
      updateGlobalSetting("SCHOOL_EMAIL", schoolEmail),
      updateGlobalSetting("SCHOOL_WEBSITE", schoolWebsite),
    ]);
    setLoading(false);
    alert("Informations de l'établissement mises à jour.");
    router.refresh();
  };

  const handleUpdateTeacherAccess = async (userId: string, current: boolean) => {
    // Optimistic update
    const previousList = [...teacherList];
    setTeacherList(teacherList.map((t: any) => 
      t.id === userId ? { ...t, canAccessLivrets: !current } : t
    ));

    setTeacherLoadingMap(prev => ({ ...prev, [userId]: true }));
    try {
      await updateTeacherLivretAccess(userId, !current);
    } catch (error) {
      // Rollback
      setTeacherList(previousList);
      alert("Erreur lors de la mise à jour des droits");
    } finally {
      setTeacherLoadingMap(prev => ({ ...prev, [userId]: false }));
      router.refresh();
    }
  };

  const handleAddSchoolYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/admin/school-years', {
      method: 'POST',
      body: JSON.stringify({ name: newSchoolYear.name, startDate: newSchoolYear.start, endDate: newSchoolYear.end }),
    });
    setNewSchoolYear({ name: '', start: '', end: '' });
    setLoading(false);
    router.refresh();
  };

  const handleLinkSemesterToSchoolYear = async (semesterId: string, schoolYearId: string) => {
    setSemesterSchoolYearLinks(prev => ({ ...prev, [semesterId]: schoolYearId }));
    await fetch('/api/admin/semesters', {
      method: 'PUT',
      body: JSON.stringify({ id: semesterId, schoolYearId }),
    });
    router.refresh();
  };

  const handleManualCleanup = async () => {
    if (!confirm("Voulez-vous supprimer toutes les notifications datant de plus d'un mois ?")) return;
    setLoading(true);
    const res = await cleanupOldNotifications();
    setLoading(false);
    if (res.ok) {
      alert(`Nettoyage réussi : ${res.count} notifications supprimées.`);
    } else {
      alert("Erreur lors du nettoyage : " + res.error);
    }
  };

  const handleUpdateNotifConfig = async (id: string, isEnabled: boolean) => {
    setLoading(true);
    await updateNotificationConfig(id, { isEnabled });
    setLoading(false);
    router.refresh();
  };

  const handleUpdateNotifRoles = async (id: string, role: string, currentRoles: string[]) => {
    setLoading(true);
    const newRoles = currentRoles.includes(role) 
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    await updateNotificationConfig(id, { targetRoles: newRoles as any });
    setLoading(false);
    router.refresh();
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/admin/classes', {
      method: 'POST',
      body: JSON.stringify({ name: newName }),
    });
    setNewName('');
    setLoading(false);
    router.refresh();
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/admin/subjects', {
      method: 'POST',
      body: JSON.stringify({ name: newName }),
    });
    setNewName('');
    setLoading(false);
    router.refresh();
  };

  const handleAddSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/admin/semesters', {
      method: 'POST',
      body: JSON.stringify({ name: newSemester.name, startDate: newSemester.start, endDate: newSemester.end }),
    });
    setNewSemester({ name: '', start: '', end: '' });
    setLoading(false);
    router.refresh();
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/admin/holidays', {
      method: 'POST',
      body: JSON.stringify(newHoliday),
    });
    setNewHoliday({ name: '', date: '' });
    setLoading(false);
    router.refresh();
  };

  const handleDelete = async (type: string, id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cet élément ?')) return;
    setLoading(true);
    await fetch(`/api/admin/${type}?id=${id}`, { method: 'DELETE' });
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex border-b border-slate-100 bg-slate-50 overflow-x-auto no-scrollbar shrink-0">
        <button 
          onClick={() => setActiveTab('classes')}
          className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest transition whitespace-nowrap ${activeTab === 'classes' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Classes ({initialClasses.length})
        </button>
        <button 
          onClick={() => setActiveTab('establishment')}
          className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest transition whitespace-nowrap ${activeTab === 'establishment' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Établissement
        </button>
        <button 
          onClick={() => setActiveTab('subjects')}
          className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest transition whitespace-nowrap ${activeTab === 'subjects' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Matières ({initialSubjects.length})
        </button>
        <button 
          onClick={() => setActiveTab('semesters')}
          className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest transition whitespace-nowrap ${activeTab === 'semesters' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Semestres ({initialSemesters.length})
        </button>
        <button 
          onClick={() => setActiveTab('school-years')}
          className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest transition whitespace-nowrap ${activeTab === 'school-years' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Années scolaires ({initialSchoolYears.length})
        </button>
        <button 
          onClick={() => setActiveTab('holidays')}
          className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest transition whitespace-nowrap ${activeTab === 'holidays' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Jours Fériés ({initialHolidays.length})
        </button>
        <button 
          onClick={() => setActiveTab('notifications')}
          className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest transition whitespace-nowrap ${activeTab === 'notifications' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Notifications ({initialNotificationConfigs.length})
        </button>
        <button 
          onClick={() => setActiveTab('options')}
          className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest transition whitespace-nowrap ${activeTab === 'options' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Options
        </button>
        <button 
          onClick={() => setActiveTab('planning')}
          className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest transition whitespace-nowrap ${activeTab === 'planning' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Emploi du temps
        </button>
        <Link 
          href="/admin/settings/competencies"
          className="px-5 py-3 text-[10px] font-black uppercase tracking-widest transition whitespace-nowrap text-slate-400 hover:text-blue-600 flex items-center gap-2"
        >
          <span>Livret (Compétences)</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-2.5 h-2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </Link>
        <button 
          onClick={() => setActiveTab('habilitations')}
          className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest transition whitespace-nowrap ${activeTab === 'habilitations' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Habilitations
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-5 custom-scrollbar">
        {activeTab === 'establishment' && (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-3xl -mr-20 -mt-20 rounded-full"></div>
               <div className="relative z-10">
                 <h3 className="text-xl font-black uppercase tracking-widest mb-2">Identité de l'école</h3>
                 <p className="text-slate-400 text-xs font-medium leading-relaxed max-w-md">
                   Ces informations sont utilisées pour personnaliser les en-têtes, les bulletins, et les communications automatiques.
                 </p>
               </div>
            </div>

            <form onSubmit={handleUpdateEstablishment} className="grid gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nom complet de l'établissement</label>
                <input 
                  type="text" 
                  className="w-full rounded-2xl border-slate-200 text-sm py-3 focus:ring-blue-500/20"
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                  placeholder="Ex: ECM Academie"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nom court (Sidebar)</label>
                <input 
                  type="text" 
                  className="w-full rounded-2xl border-slate-200 text-sm py-3 focus:ring-blue-500/20"
                  value={schoolShortName}
                  onChange={e => setSchoolShortName(e.target.value)}
                  placeholder="Ex: Skilla"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Téléphone</label>
                <input 
                  type="text" 
                  className="w-full rounded-2xl border-slate-200 text-sm py-3 focus:ring-blue-500/20"
                  value={schoolPhone}
                  onChange={e => setSchoolPhone(e.target.value)}
                  placeholder="01 23 45 67 89"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Email de contact</label>
                <input 
                  type="email" 
                  className="w-full rounded-2xl border-slate-200 text-sm py-3 focus:ring-blue-500/20"
                  value={schoolEmail}
                  onChange={e => setSchoolEmail(e.target.value)}
                  placeholder="contact@ecole.edu"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Site Web</label>
                <input 
                  type="text" 
                  className="w-full rounded-2xl border-slate-200 text-sm py-3 focus:ring-blue-500/20"
                  value={schoolWebsite}
                  onChange={e => setSchoolWebsite(e.target.value)}
                  placeholder="https://www.ecole.edu"
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Adresse</label>
                <textarea 
                  className="w-full rounded-2xl border-slate-200 text-sm py-3 focus:ring-blue-500/20 min-h-[80px]"
                  value={schoolAddress}
                  onChange={e => setSchoolAddress(e.target.value)}
                  placeholder="123 rue de l'Éducation, 75000 Paris"
                />
              </div>
              
              <div className="sm:col-span-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-500/20"
                >
                  {loading ? "Enregistrement..." : "Mettre à jour l'identité de l'établissement"}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'classes' && (
          <div className="space-y-5">
            <form onSubmit={handleAddClass} className="flex gap-2 shrink-0 sticky top-0 bg-white pb-4 z-10">
              <input 
                type="text" 
                placeholder="Nouvelle classe..." 
                className="flex-1 rounded-xl border-slate-200 text-xs py-2 focus:ring-blue-500/20"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
              />
              <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-sm">Ajouter</button>
            </form>
            <div className="grid gap-2 sm:grid-cols-3">
              {initialClasses.map((c: any) => (
                <div key={c.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50 group hover:border-blue-100 transition">
                  <span className="text-[11px] font-black text-slate-700 truncate">{c.name}</span>
                  <button onClick={() => handleDelete('classes', c.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition">&times;</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="space-y-5">
            <form onSubmit={handleAddSubject} className="flex gap-2 shrink-0 sticky top-0 bg-white pb-4 z-10">
              <input 
                type="text" 
                placeholder="Nouvelle matière..." 
                className="flex-1 rounded-xl border-slate-200 text-xs py-2 focus:ring-blue-500/20"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
              />
              <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-sm">Ajouter</button>
            </form>
            <div className="grid gap-2 sm:grid-cols-3">
              {initialSubjects.map((s: any) => (
                <div key={s.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50 group hover:border-blue-100 transition">
                  <span className="text-[11px] font-black text-slate-700 truncate">{s.name}</span>
                  <button onClick={() => handleDelete('subjects', s.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition">&times;</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'semesters' && (
          <div className="space-y-5">
            <form onSubmit={handleAddSemester} className="grid gap-2 sm:grid-cols-4 items-end shrink-0 sticky top-0 bg-white pb-4 z-10">
              <div className="sm:col-span-1">
                <label className="text-[9px] uppercase font-black text-slate-400 mb-1 block">Nom</label>
                <input 
                  type="text" 
                  placeholder="Ex: S1 2026" 
                  className="w-full rounded-xl border-slate-200 text-xs py-2"
                  value={newSemester.name}
                  onChange={e => setNewSemester({...newSemester, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-[9px] uppercase font-black text-slate-400 mb-1 block">Début</label>
                <input 
                  type="date" 
                  className="w-full rounded-xl border-slate-200 text-xs py-2"
                  value={newSemester.start}
                  onChange={e => setNewSemester({...newSemester, start: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-[9px] uppercase font-black text-slate-400 mb-1 block">Fin</label>
                <input 
                  type="date" 
                  className="w-full rounded-xl border-slate-200 text-xs py-2"
                  value={newSemester.end}
                  onChange={e => setNewSemester({...newSemester, end: e.target.value})}
                  required
                />
              </div>
              <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-sm">Créer</button>
            </form>
            <div className="grid gap-2 sm:grid-cols-2">
              {initialSemesters.map((s: any) => (
                <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 group hover:border-blue-100 transition gap-2">
                  <div className="flex-1">
                    <div className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{s.name}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">
                      {format(new Date(s.startDate), 'dd/MM/yy')} — {format(new Date(s.endDate), 'dd/MM/yy')}
                    </div>
                    {s.schoolYear && (
                      <div className="text-[8px] font-bold text-blue-500 uppercase mt-1">
                        {s.schoolYear.name}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="text-[9px] rounded-lg border-slate-200 py-1 px-2"
                      value={s.schoolYearId || ''}
                      onChange={(e) => handleLinkSemesterToSchoolYear(s.id, e.target.value)}
                    >
                      <option value="">— Année scolaire —</option>
                      {initialSchoolYears.map((sy: any) => (
                        <option key={sy.id} value={sy.id}>{sy.name}</option>
                      ))}
                    </select>
                    <button onClick={() => handleDelete('semesters', s.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition text-[10px] font-black uppercase shrink-0">Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'school-years' && (
          <div className="space-y-5">
            <form onSubmit={handleAddSchoolYear} className="grid gap-2 sm:grid-cols-4 items-end shrink-0 sticky top-0 bg-white pb-4 z-10">
              <div className="sm:col-span-1">
                <label className="text-[9px] uppercase font-black text-slate-400 mb-1 block">Nom</label>
                <input 
                  type="text" 
                  placeholder="Ex: 2025-2026" 
                  className="w-full rounded-xl border-slate-200 text-xs py-2"
                  value={newSchoolYear.name}
                  onChange={e => setNewSchoolYear({...newSchoolYear, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-[9px] uppercase font-black text-slate-400 mb-1 block">Début</label>
                <input 
                  type="date" 
                  className="w-full rounded-xl border-slate-200 text-xs py-2"
                  value={newSchoolYear.start}
                  onChange={e => setNewSchoolYear({...newSchoolYear, start: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-[9px] uppercase font-black text-slate-400 mb-1 block">Fin</label>
                <input 
                  type="date" 
                  className="w-full rounded-xl border-slate-200 text-xs py-2"
                  value={newSchoolYear.end}
                  onChange={e => setNewSchoolYear({...newSchoolYear, end: e.target.value})}
                  required
                />
              </div>
              <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-sm">Créer</button>
            </form>
            <div className="grid gap-3 sm:grid-cols-2">
              {initialSchoolYears.length === 0 && (
                <div className="sm:col-span-2 text-center py-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Aucune année scolaire définie. Créez-en une pour commencer.
                </div>
              )}
              {initialSchoolYears.map((sy: any) => (
                <div key={sy.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:border-blue-100 transition">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-xs font-black text-slate-900 uppercase tracking-widest">{sy.name}</div>
                      <div className="text-[9px] font-bold text-slate-400 mt-0.5">
                        {format(new Date(sy.startDate), 'dd MMMM yyyy', { locale: fr })} — {format(new Date(sy.endDate), 'dd MMMM yyyy', { locale: fr })}
                      </div>
                    </div>
                    <button onClick={() => handleDelete('school-years', sy.id)} className="text-red-400 hover:text-red-600 text-[10px] font-black uppercase">Supprimer</button>
                  </div>
                  {sy.semesters && sy.semesters.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Semestres rattachés</div>
                      <div className="flex flex-wrap gap-1.5">
                        {sy.semesters.map((sem: any) => (
                          <span key={sem.id} className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[9px] font-bold uppercase">
                            {sem.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'holidays' && (
          <div className="space-y-5">
            <form onSubmit={handleAddHoliday} className="grid gap-2 sm:grid-cols-3 items-end shrink-0 sticky top-0 bg-white pb-4 z-10">
              <div>
                <label className="text-[9px] uppercase font-black text-slate-400 mb-1 block">Nom</label>
                <input 
                  type="text" 
                  placeholder="Ex: Noël" 
                  className="w-full rounded-xl border-slate-200 text-xs py-2"
                  value={newHoliday.name}
                  onChange={e => setNewHoliday({...newHoliday, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-[9px] uppercase font-black text-slate-400 mb-1 block">Date</label>
                <input 
                  type="date" 
                  className="w-full rounded-xl border-slate-200 text-xs py-2"
                  value={newHoliday.date}
                  onChange={e => setNewHoliday({...newHoliday, date: e.target.value})}
                  required
                />
              </div>
              <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-sm">Ajouter</button>
            </form>
            <div className="grid gap-2 sm:grid-cols-2">
              {initialHolidays.map((h: any) => (
                <div key={h.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50 group hover:border-blue-100 transition">
                  <div>
                    <div className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{h.name}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">
                      {format(new Date(h.date), 'dd MMMM yyyy', { locale: fr })}
                    </div>
                  </div>
                  <button onClick={() => handleDelete('holidays', h.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition text-[10px] font-black uppercase">Supprimer</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 shrink-0 flex justify-between items-center gap-4">
              <p className="text-[10px] text-blue-700 font-bold uppercase tracking-widest leading-relaxed">
                Configurez les déclencheurs de notifications automatiques.
              </p>
              <button 
                onClick={handleManualCleanup}
                disabled={loading}
                className="px-3 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-50 transition shadow-sm shrink-0"
              >
                Nettoyer l'historique (+1 mois)
              </button>
            </div>

            <div className="grid gap-3">
              {initialNotificationConfigs.map((config: any) => (
                <div key={config.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:border-blue-100 transition group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">{config.event}</h3>
                      <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">MàJ : {format(new Date(config.updatedAt), 'dd/MM HH:mm')}</p>
                    </div>
                    <button
                      onClick={() => handleUpdateNotifConfig(config.id, !config.isEnabled)}
                      disabled={loading}
                      className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition shadow-sm ${
                        config.isEnabled 
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                          : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                      }`}
                    >
                      {config.isEnabled ? 'Activé' : 'Off'}
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 relative z-10">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cibles</label>
                      <div className="flex flex-wrap gap-1">
                        {['STUDENT', 'TEACHER', 'RESPONSIBLE', 'COMPANY_TUTOR', 'ADMIN'].map((role) => (
                          <button
                            key={role}
                            onClick={() => handleUpdateNotifRoles(config.id, role, config.targetRoles)}
                            disabled={loading || !config.isEnabled}
                            className={`px-2 py-0.5 rounded-md text-[8px] font-black border transition uppercase ${
                              config.targetRoles.includes(role)
                                ? 'bg-blue-50 border-blue-200 text-blue-600'
                                : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                            } ${!config.isEnabled && 'opacity-50 cursor-not-allowed'}`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Message</p>
                       <p className="text-[10px] font-black text-slate-700 truncate">{config.title}</p>
                       <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-1">{config.message}</p>
                    </div>
                  </div>
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-10 group-hover:opacity-100 transition"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'options' && (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl -mr-20 -mt-20 rounded-full"></div>
               <div className="relative z-10">
                 <h3 className="text-xl font-black uppercase tracking-widest mb-2">Options de la Plateforme</h3>
                 <p className="text-slate-400 text-xs font-medium leading-relaxed max-w-md">
                   Activez ou désactivez les modules optionnels de la plateforme pour tous les utilisateurs.
                 </p>
               </div>
            </div>

            <div className="grid gap-4">
              <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-between group hover:border-blue-100 transition">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Module Arcade</h4>
                    <p className="text-xs text-slate-500 font-medium">Jeux et gamification pour les étudiants.</p>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    const newValue = !enableArcade;
                    setEnableArcade(newValue);
                    handleUpdateOptions("ENABLE_ARCADE", String(newValue));
                  }}
                  disabled={loading}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-sm ${
                    enableArcade 
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20' 
                      : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                  }`}
                >
                  {enableArcade ? 'Activé' : 'Désactivé'}
                </button>
              </div>

              {/* Chat Module */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-between group hover:border-blue-100 transition">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 1.38-.625 2.63-1.637 3.48a7 7 0 01-5.068 1.94 7 7 0 01-5.068-1.94A7 7 0 013 12c0-1.38.625-2.63 1.637-3.48a7 7 0 015.068-1.94 7 7 0 015.068 1.94C20.375 9.37 21 10.62 21 12z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Module Chat</h4>
                    <p className="text-xs text-slate-500 font-medium">Permet aux utilisateurs de converser entre eux selon les rôles.</p>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    const newValue = !enableChat;
                    setEnableChat(newValue);
                    handleUpdateOptions("CHAT_ENABLED", String(newValue));
                  }}
                  disabled={loading}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-sm ${
                    enableChat
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20' 
                      : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                  }`}
                >
                  {enableChat ? 'Activé' : 'Désactivé'}
                </button>
              </div>

              {/* Chat Retention Days */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-between group hover:border-blue-100 transition">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Rétention des messages (jours)</h4>
                    <p className="text-xs text-slate-500 font-medium">Durée de conservation des messages avant suppression automatique.</p>
                  </div>
                </div>
                
                <input
                  type="number"
                  min="1"
                  value={chatRetentionDays}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (!isNaN(value) && value >= 1) {
                      setChatRetentionDays(value);
                      handleUpdateOptions("CHAT_RETENTION_DAYS", String(value));
                    }
                  }}
                  disabled={loading || !enableChat}
                  className="w-20 p-2 rounded-xl border-slate-200 text-sm focus:ring-blue-500/20 text-right disabled:opacity-50"
                />
              </div>

              {/* Sanctions — Points de conduite */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-between group hover:border-red-100 transition">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Points de Conduite</h4>
                    <p className="text-xs text-slate-500 font-medium">Système de capital disciplinaire (100 pts/élève). Des alertes automatiques sont générées aux paliers 50 et 20 pts.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const newValue = !enableSanctionPoints;
                    setEnableSanctionPoints(newValue);
                    handleUpdateOptions("SANCTIONS_POINTS_ENABLED", String(newValue));
                  }}
                  disabled={loading}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-sm ${
                    enableSanctionPoints
                      ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20'
                      : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                  }`}
                >
                  {enableSanctionPoints ? 'Activé' : 'Désactivé'}
                </button>
              </div>

              {/* Sanctions — Commentaires */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-between group hover:border-red-100 transition">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Commentaires Disciplinaires</h4>
                    <p className="text-xs text-slate-500 font-medium">Permet aux parents, élèves et tuteurs d'entreprise d'ajouter un commentaire de justification sur une sanction.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const newValue = !enableSanctionComments;
                    setEnableSanctionComments(newValue);
                    handleUpdateOptions("SANCTIONS_COMMENTS_ENABLED", String(newValue));
                  }}
                  disabled={loading}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-sm ${
                    enableSanctionComments
                      ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/20'
                      : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                  }`}
                >
                  {enableSanctionComments ? 'Activé' : 'Désactivé'}
                </button>
              </div>

              {/* Qualiopi — Module satisfaction & réclamations */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-between group hover:border-violet-100 transition">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.563.563 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Module Qualiopi</h4>
                    <p className="text-xs text-slate-500 font-medium">Affiche le menu Qualiopi, les enquêtes de satisfaction et les indicateurs dans le tour de contrôle.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const newValue = !enableQualiopi;
                    setEnableQualiopi(newValue);
                    handleUpdateOptions("QUALIOPI_ENABLED", String(newValue));
                  }}
                  disabled={loading}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-sm ${
                    enableQualiopi
                      ? 'bg-violet-500 text-white hover:bg-violet-600 shadow-violet-500/20'
                      : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                  }`}
                >
                  {enableQualiopi ? 'Activé' : 'Désactivé'}
                </button>
              </div>

              {/* Rendez-vous */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-between group hover:border-sky-100 transition">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Demandes de Rendez-vous</h4>
                    <p className="text-xs text-slate-500 font-medium">Permet aux élèves, parents et tuteurs de solliciter un entretien avec l'administration.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const newValue = !enableMeetings;
                    setEnableMeetings(newValue);
                    handleUpdateOptions("MEETINGS_ENABLED", String(newValue));
                  }}
                  disabled={loading}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-sm ${
                    enableMeetings
                      ? 'bg-sky-500 text-white hover:bg-sky-600 shadow-sky-500/20'
                      : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                  }`}
                >
                  {enableMeetings ? 'Activé' : 'Désactivé'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'planning' && (
          <div className="space-y-6 max-w-lg">
            {/* Hero banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0ea5e9 100%)',
                borderRadius: '1.25rem',
                padding: '1.5rem',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* decorative circle */}
              <div style={{
                position: 'absolute', top: '-1.5rem', right: '-1.5rem',
                width: '8rem', height: '8rem',
                borderRadius: '50%',
                background: 'rgba(14,165,233,0.15)',
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '2rem', height: '2rem',
                    background: 'rgba(14,165,233,0.2)',
                    borderRadius: '0.75rem',
                  }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#38bdf8" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                    </svg>
                  </span>
                  <span style={{ color: '#38bdf8', fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                    Pause Repas
                  </span>
                </div>
                <p style={{ color: '#cbd5e1', fontSize: '0.7rem', fontWeight: 600 }}>
                  Définissez la plage horaire bloquée pour la pause déjeuner dans l'emploi du temps.
                </p>
              </div>
            </div>

            {/* Form card */}
            <div style={{
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(12px)',
              borderRadius: '1.25rem',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 4px 24px rgba(0,0,0,0.05)',
            }}>
              <form onSubmit={handleUpdateLunch} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest block">Heure de début</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{
                        position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                      }}>
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={2}>
                          <circle cx="12" cy="12" r="10"/>
                          <path strokeLinecap="round" d="M12 6v6l3 3"/>
                        </svg>
                      </span>
                      <input
                        type="time"
                        style={{ paddingLeft: '2.25rem' }}
                        className="w-full rounded-xl border-slate-200 text-xs py-2.5 focus:ring-sky-400/30 focus:border-sky-400 transition"
                        value={lunchStart}
                        onChange={e => setLunchStart(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest block">Heure de fin</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{
                        position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                      }}>
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={2}>
                          <circle cx="12" cy="12" r="10"/>
                          <path strokeLinecap="round" d="M12 6v6l3 3"/>
                        </svg>
                      </span>
                      <input
                        type="time"
                        style={{ paddingLeft: '2.25rem' }}
                        className="w-full rounded-xl border-slate-200 text-xs py-2.5 focus:ring-sky-400/30 focus:border-sky-400 transition"
                        value={lunchEnd}
                        onChange={e => setLunchEnd(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Duration preview */}
                {lunchStart && lunchEnd && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    background: '#f0f9ff', borderRadius: '0.75rem',
                    padding: '0.75rem 1rem', border: '1px solid #bae6fd',
                  }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#0ea5e9" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0284c7' }}>
                      Durée de la pause :{' '}
                      {(() => {
                        const [sh, sm] = lunchStart.split(':').map(Number);
                        const [eh, em] = lunchEnd.split(':').map(Number);
                        const diff = (eh * 60 + em) - (sh * 60 + sm);
                        if (diff <= 0) return '—';
                        return `${Math.floor(diff / 60)}h${diff % 60 > 0 ? String(diff % 60).padStart(2, '0') : ''}`;
                      })()}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    background: loading ? '#94a3b8' : 'linear-gradient(135deg, #0f172a 0%, #0ea5e9 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.875rem',
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.625rem',
                    fontWeight: 900,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(14,165,233,0.35)',
                    transition: 'all 0.2s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  }}
                >
                  {loading ? (
                    <>
                      <svg style={{ animation: 'spin 1s linear infinite' }} width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Enregistrer les horaires
                    </>
                  )}
                </button>
              </form>
            </div>

            <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed tracking-widest text-center">
              Ces horaires s'affichent comme zone grisée sur l'emploi du temps de tous les utilisateurs.
            </p>
          </div>
        )}

        {activeTab === 'habilitations' && (
          <div className="space-y-5">
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #451a03 0%, #78350f 50%, #d97706 100%)',
              borderRadius: '1.25rem',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              overflow: 'hidden',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: '-2rem', right: '-2rem',
                width: '7rem', height: '7rem',
                borderRadius: '50%',
                background: 'rgba(251,191,36,0.12)',
              }} />
              <div style={{
                flexShrink: 0,
                width: '2.5rem', height: '2.5rem',
                background: 'rgba(251,191,36,0.2)',
                borderRadius: '0.875rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fbbf24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ color: '#fef3c7', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                  Habilitations — Accès Livrets
                </div>
                <div style={{ color: '#fcd34d', fontSize: '0.7rem', fontWeight: 600, marginTop: '0.2rem' }}>
                  Autorisez des professeurs spécifiques à consulter et éditer les livrets d'apprentissage.
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: '1rem', padding: '1rem', textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#16a34a' }}>
                  {teacherList.filter((t: any) => t.canAccessLivrets).length}
                </div>
                <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#15803d', marginTop: '0.2rem' }}>
                  Prof. habilités
                </div>
              </div>
              <div style={{
                background: '#fff7ed', border: '1px solid #fed7aa',
                borderRadius: '1rem', padding: '1rem', textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ea580c' }}>
                  {teacherList.filter((t: any) => !t.canAccessLivrets).length}
                </div>
                <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#c2410c', marginTop: '0.2rem' }}>
                  Sans accès
                </div>
              </div>
            </div>

            {/* Teacher list */}
            <div className="space-y-2">
              {teacherList.map((teacher: any) => (
                <div
                  key={teacher.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.875rem 1.25rem',
                    borderRadius: '1rem',
                    border: teacher.canAccessLivrets ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                    background: teacher.canAccessLivrets ? 'linear-gradient(to right, #f0fdf4, #ffffff)' : '#ffffff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'all 0.25s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Avatar */}
                    <div style={{
                      width: '2.25rem', height: '2.25rem',
                      borderRadius: '50%',
                      background: teacher.canAccessLivrets
                        ? 'linear-gradient(135deg, #16a34a, #86efac)'
                        : 'linear-gradient(135deg, #94a3b8, #cbd5e1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <span style={{ color: 'white', fontSize: '0.65rem', fontWeight: 900 }}>
                        {(teacher.firstName?.[0] || '').toUpperCase()}{(teacher.lastName?.[0] || '').toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                        {teacher.lastName} {teacher.firstName}
                      </div>
                      <div style={{ fontSize: '0.6rem', fontWeight: 700, color: teacher.canAccessLivrets ? '#16a34a' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.1rem' }}>
                        {teacher.canAccessLivrets ? '✓ Accès livrets autorisé' : 'Accès livrets restreint'}
                      </div>
                    </div>
                  </div>

                  {/* Toggle switch */}
                  <button
                    onClick={() => handleUpdateTeacherAccess(teacher.id, teacher.canAccessLivrets)}
                    disabled={!!teacherLoadingMap[teacher.id]}
                    aria-label={teacher.canAccessLivrets ? 'Révoquer accès livrets' : 'Accorder accès livrets'}
                    style={{
                      position: 'relative',
                      width: '3.25rem', height: '1.75rem',
                      borderRadius: '999px',
                      border: 'none',
                      background: teacher.canAccessLivrets
                        ? 'linear-gradient(135deg, #16a34a, #22c55e)'
                        : '#e2e8f0',
                      cursor: teacherLoadingMap[teacher.id] ? 'not-allowed' : 'pointer',
                      transition: 'background 0.3s ease',
                      boxShadow: teacher.canAccessLivrets ? '0 2px 8px rgba(22,163,74,0.4)' : 'inset 0 2px 4px rgba(0,0,0,0.08)',
                      flexShrink: 0,
                      opacity: teacherLoadingMap[teacher.id] ? 0.6 : 1,
                    }}
                  >
                    {teacherLoadingMap[teacher.id] ? (
                      <span style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '0.875rem', height: '0.875rem',
                        border: '2px solid rgba(255,255,255,0.4)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'spin 0.6s linear infinite',
                        display: 'block',
                      }} />
                    ) : (
                      <span
                        style={{
                          position: 'absolute',
                          top: '0.2rem',
                          left: teacher.canAccessLivrets ? 'calc(100% - 1.35rem)' : '0.2rem',
                          width: '1.35rem', height: '1.35rem',
                          borderRadius: '50%',
                          background: 'white',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                          transition: 'left 0.25s ease',
                          display: 'block',
                        }}
                      />
                    )}
                  </button>
                </div>
              ))}
              {teachers.length === 0 && (
                <div style={{
                  textAlign: 'center', padding: '3rem 1rem',
                  color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.1em', fontStyle: 'italic',
                }}>
                  Aucun professeur trouvé.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
