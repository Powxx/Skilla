"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type Props = {
  className: string;
  targetId?: string;
};

export default function ClassPdfExport({ className, targetId = "class-report-content" }: Props) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    const element = document.getElementById(targetId);
    if (!element) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, (pdfHeight - 40) / imgHeight);

      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 20;

      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      const cleanName = className.replace(/[^a-zA-Z0-9]/g, "_");
      const dateStr = new Date().toISOString().split("T")[0];
      pdf.save(`liste_eleves_${cleanName}_${dateStr}.pdf`);
    } catch (err) {
      console.error("Erreur lors de la génération du PDF:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExportPDF}
      disabled={isExporting}
      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-slate-800 transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
    >
      <Printer className="h-4 w-4" />
      {isExporting ? "Génération..." : "Exporter PDF"}
    </button>
  );
}
