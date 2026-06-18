"use client";

import React from 'react';
import { format } from 'date-fns';

// Ajout du type catégorie pour le tableau
type Competency = {
  id: string;
  name: string;
  level: number; // 1, 2, 3
  category: string; // Autoriser string pour éviter les conflits de types
  lastUpdated: string;
};

type Props = {
  studentName: string;
  competencies: Competency[];
  isEditable?: boolean;
  onUpdate?: (id: string, newLevel: number) => void;
};

const STATUS_MAP: Record<number, { label: string, color: string, bg: string }> = {
  1: { label: "Non acquis", color: "text-red-700", bg: "bg-red-50 border-red-100" },
  2: { label: "En cours", color: "text-amber-700", bg: "bg-amber-50 border-amber-100" },
  3: { label: "Acquis", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" }
};

export default function LivretBody({ studentName, competencies, isEditable, onUpdate }: Props) {
  // Grouper les compétences par nom pour le tableau comparatif
  const competencyGroups = competencies.reduce((acc, c) => {
    // Nettoyer le nom pour avoir une clé commune
    const baseName = c.name.replace(' (École)', '').replace(' (Entreprise)', '');
    if (!acc[baseName]) acc[baseName] = { id: baseName, SCHOOL: null, ENTERPRISE: null };
    (acc[baseName] as any)[c.category] = c.level;
    return acc;
  }, {} as Record<string, { id: string, SCHOOL: number | null, ENTERPRISE: number | null }>);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          @page { size: portrait; margin: 1cm; }
          body { font-size: 10px; overflow: hidden !important; }
          .break-avoid { break-inside: avoid; }
          /* Masquer les barres de défilement */
          *::-webkit-scrollbar { display: none; }
          * { scrollbar-width: none; }
        }
      `}</style>

      {/* ... (Header no-print) */}
      <header className="flex justify-between items-end no-print">
        {/* ... */}
      </header>

      {/* ... Vue écran */}

      {/* Vue Impression */}
      <div className="hidden print:block print-only">
        <h1 className="text-xl font-black text-slate-900 mb-6">LIVRET D'APPRENTISSAGE - {studentName}</h1>
        
        <table className="w-full border-collapse border border-slate-300 text-[10px] break-avoid">
          {/* ... (Table content) */}
        </table>
        
        <div className="mt-8 pt-4 border-t text-right text-[9px] text-slate-400 break-avoid">
           Document généré le {format(new Date(), 'dd/MM/yyyy HH:mm')}
        </div>
      </div>
    </div>
  );
}
