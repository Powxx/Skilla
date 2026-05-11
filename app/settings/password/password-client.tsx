"use client";

import { useState } from "react";
import { changePassword } from "@/app/actions/settings";

export default function PasswordChangeClient() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const action = async (formData: FormData) => {
    const res = await changePassword(formData);
    if (res.ok) {
        setSuccess(true);
        setError(null);
    } else {
        setError(res.error || "Erreur inconnue");
    }
  };

  return (
    <form action={action} className="bg-white p-6 rounded-xl border max-w-md space-y-4">
      <h2 className="text-lg font-bold">Changer mon mot de passe</h2>
      {success && <p className="text-green-600 text-sm">Mot de passe mis à jour !</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <input name="currentPassword" type="password" placeholder="Ancien mot de passe" className="w-full border p-2 rounded" required />
      <input name="newPassword" type="password" placeholder="Nouveau mot de passe" className="w-full border p-2 rounded" required />
      <input name="confirmPassword" type="password" placeholder="Confirmer nouveau mot de passe" className="w-full border p-2 rounded" required />
      <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded">Mettre à jour</button>
    </form>
  );
}
