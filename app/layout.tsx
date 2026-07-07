import type React from "react";
import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Óptima by Righello",
  description:
    "Piattaforma gestionale AI per project management, clienti, task, preventivi, team operations e controllo aziendale.",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkProxyUrl = process.env.NEXT_PUBLIC_CLERK_PROXY_URL;
  const canonicalRedirectScript = `
    (function () {
      var stagingHost = "optima-beta-staging.axel-15d.workers.dev";
      var canonicalOrigin = "https://appbeta.wearerighello.com";
      if (window.location.hostname === stagingHost) {
        window.location.replace(canonicalOrigin + window.location.pathname + window.location.search + window.location.hash);
      }
    })();
  `;

  return (
    <html lang="it" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: canonicalRedirectScript,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "globalThis.__name=globalThis.__name||function(fn){return fn};globalThis.e=globalThis.e||globalThis.__name",
          }}
        />
        <ClerkProvider proxyUrl={clerkProxyUrl}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
            <SonnerToaster richColors closeButton position="top-right" />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
