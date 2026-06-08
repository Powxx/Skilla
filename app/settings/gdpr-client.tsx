"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Trash2, ShieldCheck } from "lucide-react";
import { exportUserData, requestAccountDeletion } from "@/app/actions/settings";

export default function GDPRSettingsClient() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
        const data = await exportUserData();
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "mes-donnees.json";
        a.click();
    } catch (e) {
        alert("Erreur lors de l'exportation.");
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (confirm("Êtes-vous sûr de vouloir demander la suppression définitive de votre compte ? Cette action sera examinée par un administrateur.")) {
        setLoading(true);
        try {
            await requestAccountDeletion();
            alert("Votre demande de suppression a été envoyée aux administrateurs.");
        } catch (e) {
            alert("Erreur lors de la demande.");
        }
        setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6 max-w-lg">
      <div className="flex items-center gap-3 text-slate-900">
        <ShieldCheck className="text-emerald-600" />
        <h2 className="text-lg font-bold">Mes données personnelles (RGPD)</h2>
      </div>

      <div className="space-y-4">
        <button onClick={handleExport} disabled={loading} className="flex items-center gap-2 w-full p-3 border rounded-lg hover:bg-slate-50 disabled:opacity-50">
            <Download size={18} />
            <span>{loading ? "Exportation..." : "Exporter mes données (Portabilité)"}</span>
        </button>
        
        <button onClick={handleDelete} disabled={loading} className="flex items-center gap-2 w-full p-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50">
            <Trash2 size={18} />
            <span>Demander la suppression de mon compte</span>
        </button>
      </div>

      <p className="text-xs text-slate-500">
        Consultez notre <Link href="/privacy" className="underline text-blue-600">Politique de Confidentialité</Link> pour plus de détails sur vos droits.
      </p>
    </div>
  );
}
