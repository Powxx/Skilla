"use client";

import { useState, useTransition } from "react";
import { sendClassNotification } from "@/app/actions/notifications";
import { Send, CheckCircle, AlertCircle } from "lucide-react";

export default function SendNotificationClient({ classes }: { classes: { id: string, name: string }[] }) {
  const [pending, transition] = useTransition();
  const [status, setStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      classId: fd.get("classId") as string,
      title: fd.get("title") as string,
      message: fd.get("message") as string,
    };

    transition(async () => {
      const res = await sendClassNotification(data);
      if (res) {
          setStatus({type: 'success', message: "Notification envoyée avec succès !"});
          e.currentTarget.reset();
      } else {
          setStatus({type: 'error', message: "Erreur lors de l'envoi."});
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border shadow-sm space-y-6 max-w-lg">
      <div>
        <h2 className="text-xl font-black text-slate-900">Nouvelle notification</h2>
        <p className="text-sm text-slate-500">Diffusez une information importante à une classe.</p>
      </div>
      
      <div className="space-y-4">
        <select name="classId" className="w-full p-3 border rounded-xl bg-slate-50" required>
            <option value="">Choisir une classe</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input name="title" placeholder="Titre de l'annonce" className="w-full p-3 border rounded-xl bg-slate-50" required />
        <textarea name="message" placeholder="Détails du message..." className="w-full p-3 border rounded-xl bg-slate-50 h-32" required />
      </div>

      <button disabled={pending} className="flex items-center justify-center gap-2 w-full bg-slate-900 text-white font-bold p-3 rounded-xl hover:bg-slate-800 disabled:opacity-50">
        <Send size={18} />
        {pending ? "Envoi..." : "Envoyer la notification"}
      </button>

      {status && (
        <div className={`flex items-center gap-2 p-4 rounded-xl ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <p className="text-sm font-bold">{status.message}</p>
        </div>
      )}
    </form>
  );
}
