import type React from "react"
import { ClerkProvider } from "@clerk/nextjs"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
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
  return (
    <html lang="it" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: "globalThis.__name=globalThis.__name||function(fn){return fn}",
          }}
        />
        <ClerkProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            {children}
            <Toaster />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
