import "./globals.css";
import type { Metadata, Viewport } from "next";
import Providers from "@/app/providers";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Inter } from "next/font/google";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"], display: 'swap' });

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "ECM Academie - Gestion d'Emploi du temps",
  description: "Plateforme de gestion pour alternance",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Skilla",
  },
  icons: {
    icon: "/SKILLA-Logo.png",
    apple: "/SKILLA-Logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.className} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          {children}
          <Analytics />
          <SpeedInsights />
        </Providers>
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                var registerSW = function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    },
                    function(err) {
                      console.error('ServiceWorker registration failed: ', err);
                    }
                  );
                };
                if (document.readyState === 'complete' || document.readyState === 'interactive') {
                  registerSW();
                } else {
                  window.addEventListener('load', registerSW);
                }
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
