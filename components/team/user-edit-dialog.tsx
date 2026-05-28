"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Edit, Shield, User, Users, Crown } from "lucide-react"
import { toast } from "sonner"
import type { User as UserType } from "@/lib/types"

const editUserSchema = z.object({
  firstName: z.string().min(1, "Nome è obbligatorio"),
  lastName: z.string().min(1, "Cognome è obbligatorio"),
  email: z.string().email("Inserisci un indirizzo email valido"),
  role: z.enum(["super-admin", "admin", "direzione", "capo-reparto", "junior", "client"], {
    required_error: "Seleziona un ruolo",
  }),
  companyName: z.string().optional(),
  isSuspended: z.boolean().default(false),
})

type EditUserForm = z.infer<typeof editUserSchema>

interface UserEditDialogProps {
  user: UserType
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserUpdated?: () => void
}

const roleOptions = [
  {
    value: "super-admin" as const,
    label: "Super Admin",
    description: "Accesso completo alla piattaforma",
    icon: Crown,
  },
  {
    value: "admin" as const,
    label: "Amministratore",
    description: "Accesso completo alla gestione agenzia",
    icon: Shield,
  },
  {
    value: "direzione" as const,
    label: "Direzione",
    description: "Gestione strategica e supervisione",
    icon: Shield,
  },
  {
    value: "capo-reparto" as const,
    label: "Capo Reparto",
    description: "Coordinamento team e progetti",
    icon: Users,
  },
  {
    value: "junior" as const,
    label: "Junior",
    description: "Accesso ai progetti, task e rapportini assegnati",
    icon: User,
  },
  {
    value: "client" as const,
    label: "Cliente",
    description: "Accesso solo al proprio workspace",
    icon: User,
  },
]

export function UserEditDialog({ user, open, onOpenChange, onUserUpdated }: UserEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "junior",
      companyName: "",
      isSuspended: false,
    },
  })

  // Aggiorna i valori del form quando cambia l'utente
  useEffect(() => {
    if (user && open) {
      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        role: user.role || "junior",
        companyName: user.companyName || "",
        isSuspended: user.isSuspended || false,
      })
    }
  }, [user, open, form])

  const onSubmit = async (data: EditUserForm) => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/team/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Errore nell'aggiornamento utente")
      }

      toast.success("Utente aggiornato con successo")
      onUserUpdated?.()
      onOpenChange(false)

    } catch (error) {
      console.error("Error updating user:", error)
      toast.error(error instanceof Error ? error.message : "Errore nell'aggiornamento utente")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg">
              <Edit className="h-5 w-5 text-white" />
            </div>
            Modifica Utente
          </DialogTitle>
          <DialogDescription>
            Modifica le informazioni di {user.firstName} {user.lastName}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Nome e Cognome */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Mario" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cognome</FormLabel>
                    <FormControl>
                      <Input placeholder="Rossi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="utente@example.com"
                      type="email"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Ruolo */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ruolo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona un ruolo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roleOptions.map((option) => {
                        const Icon = option.icon
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{option.label}</div>
                                <div className="text-xs text-gray-500">{option.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Azienda (opzionale) */}
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Azienda (opzionale)</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome azienda" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Account sospeso */}
            <FormField
              control={form.control}
              name="isSuspended"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Account Sospeso
                    </FormLabel>
                    <FormDescription className="text-sm text-gray-500">
                      L'utente non potrà accedere alla piattaforma
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  "Salva Modifiche"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
