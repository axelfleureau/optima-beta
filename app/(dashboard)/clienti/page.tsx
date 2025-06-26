import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Shell } from "@/components/ui/shell"
import { PlusIcon } from "@radix-ui/react-icons"
import { MoreHorizontal } from "lucide-react"
import Link from "next/link"

const ClientsPage = () => {
  return (
    <Shell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Panoramica Clienti</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/app/(dashboard)/clienti/nuovo">
              <PlusIcon className="mr-2 h-4 w-4" />
              Aggiungi Cliente
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal className="mr-2 h-4 w-4" />
                Altro
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Azioni</DropdownMenuLabel>
              <DropdownMenuItem>Esporta</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Impostazioni</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Shell>
  )
}

export default ClientsPage
