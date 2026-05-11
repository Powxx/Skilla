"use client";

import { useState, useTransition } from "react";
import { sendClassNotification } from "@/app/actions/notifications";

export default function SendNotificationClient({ classes }: { classes: { id: string, name: string }[] }) {
  const [pending, transition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

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
          setStatus("Notification envoyée avec succès !");
          e.currentTarget.reset();
      } else {
          setStatus("Erreur lors de l'envoi.");
      }
    });
  };
//...

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border space-y-4">
      <h2 className="text-lg font-bold">Envoyer une notification à une classe</h2>
      <select name="classId" className="w-full p-2 border rounded">
        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input name="title" placeholder="Titre" className="w-full p-2 border rounded" required />
      <textarea name="message" placeholder="Message" className="w-full p-2 border rounded" required />
      <button disabled={pending} className="bg-blue-600 text-white px-4 py-2 rounded">Envoyer</button>
      {status && <p>{status}</p>}
    </form>
  );
}
