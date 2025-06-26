import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-8">
        <h1 className="text-6xl font-bold text-gray-800">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mt-4">Pagina non trovata</h2>
        <p className="text-gray-600 mt-2">La pagina che stai cercando non esiste o è stata spostata.</p>
        <div className="mt-8">
          <Link href="/">
            <Button>
              <Home className="mr-2 h-4 w-4" />
              Torna alla home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
