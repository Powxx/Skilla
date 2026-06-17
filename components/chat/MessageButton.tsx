"use client";

import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function MessageButton({ recipientId, recipientName }: { recipientId: string; recipientName: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStartChat = async () => {
    setLoading(true);
    try {
      // Pour l'instant, on redirige vers la page des messages
      // Dans une implémentation plus complète, on pourrait ouvrir une modale
      router.push(`/messages?recipientId=${recipientId}`);
    } catch (error) {
      console.error("Erreur lors de l'ouverture du chat:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleStartChat}
      disabled={loading}
      className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 transition"
      title={`Envoyer un message à ${recipientName}`}
    >
      <MessageSquare className="h-3 w-3" />
    </button>
  );
}
