import CalendarWrapper from "../../../components/ui/calendar-wrapper"

// Force dynamic rendering
export const dynamic = "force-dynamic"
export const revalidate = 0

// Metadata for the page
export const metadata = {
  title: "Calendario Editoriale",
  description: "Gestisci i tuoi contenuti editoriali",
}

export default function CalendarPage() {
  return <CalendarWrapper />
}
