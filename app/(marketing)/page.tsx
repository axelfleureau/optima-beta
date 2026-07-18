import type { Metadata } from "next"

import OptimaLanding from "@/components/marketing/optima-landing"

export const metadata: Metadata = {
  title: "Óptima by Righello | Il gestionale AI per agenzie e studi",
  description:
    "Óptima riunisce clienti, progetti, task, contenuti, video review, preventivi, presenze e un assistente AI in un solo gestionale. Nato dentro un'agenzia, per chi gestisce clienti e consegne.",
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
      "Clienti, progetti, contenuti, video review, preventivi e team in un solo gestionale AI. Per agenzie e studi creativi.",
    url: "/",
    siteName: "Óptima by Righello",
    type: "website",
    locale: "it_IT",
  },
  twitter: {
    card: "summary_large_image",
    title: "Óptima by Righello",
    description:
      "Clienti, progetti, contenuti, preventivi, presenze e assistente AI in un solo gestionale, per agenzie e studi.",
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
