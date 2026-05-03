import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Skilla - Gestion de Planning",
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
        {children}
      </body>
    </html>
  );
}