import TeamCalendarClient from "./team-calendar-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata = {
  title: "Calendario Team",
  description: "Pianifica shooting, call, appuntamenti e impegni operativi del team",
}

export default function TeamCalendarPage() {
  return <TeamCalendarClient />
}
