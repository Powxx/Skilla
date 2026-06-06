"use client";

import { useState } from "react";
import { sendAdminNotification } from "@/app/actions/notifications";

export default function AdminNotificationSender({ classes }: { classes: { id: string, name: string }[] }) {
  const [target, setTarget] = useState<'CLASS' | 'SCHOOL'>('SCHOOL');
  const [classId, setClassId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      await sendAdminNotification({ target, classId, title, message });
      setTitle('');
      setMessage('');
      alert("Notification envoyée !");
    } catch (error) {
      alert("Erreur lors de l'envoi");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <h2 className="text-lg font-bold text-slate-900">Envoyer une notification</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <button type="button" onClick={() => setTarget('SCHOOL')} className={`py-2 px-4 rounded-xl font-bold text-sm border ${target === 'SCHOOL' ? 'bg-sky-600 text-white border-sky-600' : 'bg-slate-50 border-slate-200'}`}>Toute l'école</button>
        <button type="button" onClick={() => setTarget('CLASS')} className={`py-2 px-4 rounded-xl font-bold text-sm border ${target === 'CLASS' ? 'bg-sky-600 text-white border-sky-600' : 'bg-slate-50 border-slate-200'}`}>Par classe</button>
      </div>

      {target === 'CLASS' && (
        <select value={classId} onChange={(e) => setClassId(e.target.value)} required className="w-full rounded-xl border-slate-200 text-sm">
          <option value="">Sélectionner une classe</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}

      <input type="text" placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full rounded-xl border-slate-200 text-sm" />
      <textarea placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} required className="w-full rounded-xl border-slate-200 text-sm" rows={3} />
      
      <button type="submit" disabled={isSending} className="w-full py-2 bg-slate-900 text-white font-bold rounded-xl text-sm hover:bg-slate-800 disabled:opacity-50">
        {isSending ? "Envoi..." : "Envoyer"}
      </button>
    </form>
  );
}
