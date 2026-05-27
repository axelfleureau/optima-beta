import type React from "react"
import { ClerkProvider } from "@clerk/nextjs"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import "./globals.css"

export const metadata = {
  title: "Óptima by Righello",
  description:
    "Piattaforma gestionale AI per project management, clienti, task, preventivi, team operations e controllo aziendale.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const clerkProxyUrl = process.env.NEXT_PUBLIC_CLERK_PROXY_URL

  return (
    <html lang="it" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: "globalThis.__name=globalThis.__name||function(fn){return fn}",
          }}
        />
        <ClerkProvider proxyUrl={clerkProxyUrl}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            {children}
            <Toaster />
            <SonnerToaster richColors closeButton position="top-right" />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
