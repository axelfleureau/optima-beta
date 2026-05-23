import type { Metadata } from "next"

import OptimaLanding from "@/components/marketing/optima-landing"

export const metadata: Metadata = {
  title: "Óptima by Righello | AI company operating system",
  description:
    "Óptima è la piattaforma gestionale AI di Righello per project management, gestione clienti, task, time tracking, preventivi, team operations e controllo aziendale.",
  keywords: [
    "Óptima",
    "Optima Righello",
    "AI company operating system",
    "project management AI",
    "gestione progetti",
    "gestione task",
    "time tracking",
    "preventivi AI",
    "gestione clienti",
    "controllo aziendale",
    "team operations",
    "Righello",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Óptima by Righello",
    description:
      "Il cockpit operativo AI per collegare progetti, clienti, persone, preventivi e segnali aziendali.",
    url: "/",
    siteName: "Óptima by Righello",
    type: "website",
    locale: "it_IT",
  },
  twitter: {
    card: "summary_large_image",
    title: "Óptima by Righello",
    description:
      "Project management, AI assistant, clienti, preventivi, time tracking e controllo aziendale in un solo sistema.",
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://appbeta.wearerighello.com/#organization",
      name: "Righello",
      url: "https://www.wearerighello.com/",
      sameAs: [
        "https://www.instagram.com/wearerighello",
        "https://www.linkedin.com/company/righello",
        "https://www.tiktok.com/@wearerighello",
      ],
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://appbeta.wearerighello.com/#software",
      name: "Óptima",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      creator: {
        "@id": "https://appbeta.wearerighello.com/#organization",
      },
      description:
        "Piattaforma gestionale AI per project management, gestione clienti, task, preventivi, team operations, time tracking e controllo aziendale.",
      offers: {
        "@type": "Offer",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
      },
    },
  ],
}

export default function MarketingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />
      <OptimaLanding />
    </>
  )
}
