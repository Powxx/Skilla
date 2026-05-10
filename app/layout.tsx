import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: "ECM Academie - Gestion d'Emploi du temps",
  description: "Plateforme de gestion pour alternance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <Providers>
          {children}
          <Analytics />
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  );
}
