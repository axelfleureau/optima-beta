import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PlusIcon } from "@radix-ui/react-icons"
import Link from "next/link"

export default function PreventiviPage() {
  return (
    <div>
      <div className="flex justify-between">
        <div>
          <h1 className="text-3xl font-bold">Preventivi</h1>
        </div>
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Azioni <PlusIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Azioni</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link href="/app/preventivi/nuovo" className="w-full h-full block">
                  Nuovo Preventivo
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/app/preventivi/importa" className="w-full h-full block">
                  Importa Preventivo
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
