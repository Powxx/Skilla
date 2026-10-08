"use client";

import { useTransition } from "react";
import { markAllAsRead } from "@/app/actions/notifications";
import { CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MarkAllReadButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleMarkAll = () => {
    startTransition(async () => {
      try {
        await markAllAsRead();
        router.refresh();
      } catch (e) {
        console.error(e);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleMarkAll}
      disabled={isPending}
      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition cursor-pointer disabled:opacity-50"
      title="Marquer toutes les notifications reçues comme lues"
    >
      <CheckCheck className="h-3.5 w-3.5" />
      <span>{isPending ? "Mise à jour..." : "Tout marquer lu"}</span>
    </button>
  );
}
