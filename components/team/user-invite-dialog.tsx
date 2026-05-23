"use client"

import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useAuth } from "@/lib/auth-context"
import { Mail, Loader2, UserPlus, Shield, User, Users, Crown, Settings } from "lucide-react"
import { toast } from "sonner"
import { getManageableRoles, getRoleDisplayName } from "@/lib/role-hierarchy"

const inviteUserSchema = z.object({
  email: z.string().email("Inserisci un indirizzo email valido"),
  firstName: z.string().min(1, "Nome è obbligatorio"),
  lastName: z.string().min(1, "Cognome è obbligatorio"),
  role: z.enum(["admin", "direzione", "capo-reparto", "junior", "client"], {
    required_error: "Seleziona un ruolo",
  }),
  companyName: z.string().optional(),
  message: z.string().optional(),
})

type InviteUserForm = z.infer<typeof inviteUserSchema>

interface UserInviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvited?: () => void | Promise<void>
}

const roleOptions = [
  {
    value: "admin" as const,
    label: "Admin",
    description: "Gestione completa del tenant (agenzia cliente)",
    icon: Shield,
  },
  {
    value: "direzione" as const,
    label: "Direzione",
    description: "Privilegi Admin con account personale soci-lavoratori",
    icon: Crown,
  },
  {
    value: "capo-reparto" as const,
    label: "Capo Reparto",
    description: "Gestione di uno o più reparti",
    icon: Settings,
  },
  {
    value: "junior" as const,
    label: "Junior",
    description: "Gestione esclusiva delle task assegnate",
    icon: User,
  },
  {
    value: "client" as const,
    label: "Cliente",
    description: "Accesso cliente a lavori, task e avanzamenti",
    icon: Users,
  },
]

export function UserInviteDialog({ open, onOpenChange, onInvited }: UserInviteDialogProps) {
  const { userData } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  
  // Get roles that current user can manage based on hierarchy
  const manageableRoles = userData?.role ? getManageableRoles(userData.role as any) : []
  
  // Filter role options based on what current user can manage
  const availableRoleOptions = roleOptions.filter(role => 
    manageableRoles.includes(role.value as any)
  )

  const form = useForm<InviteUserForm>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: "junior",
      companyName: "",
      message: "",
    },
  })

  const onSubmit = async (data: InviteUserForm) => {
    if (!userData) {
      toast.error("Errore di autenticazione")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/team/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          inviterName: `${userData.firstName} ${userData.lastName}`,
          inviterEmail: userData.email,
          tenantId: userData.tenantId,
        }),
      })

      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Errore nell'invito utente")
        } else {
          throw new Error("Errore nell'invito utente")
        }
      }

      // Only parse JSON if response has content and is JSON
      const contentType = response.headers.get("content-type")
      const result =
        response.status !== 204 && contentType && contentType.includes("application/json")
          ? await response.json()
          : null
      
      toast.success(result?.message || `Invito inviato con successo a ${data.email}`)
      await onInvited?.()
      
      // Reset form and close dialog
      form.reset()
      onOpenChange(false)

    } catch (error) {
      console.error("Error inviting user:", error)
      toast.error(error instanceof Error ? error.message : "Errore nell'invio dell'invito")
    } finally {
      setIsLoading(false)
    }
  }

  if (availableRoleOptions.length === 0) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            Invita Nuovo Utente
          </DialogTitle>
          <DialogDescription>
            Invia un invito per far entrare un nuovo membro nel tuo team
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input 
                        placeholder="utente@example.com" 
                        className="pl-10"
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            {/* Ruolo */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ruolo</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona un ruolo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableRoleOptions.length > 0 ? (
                        availableRoleOptions.map((option) => {
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
                        })
                      ) : (
                        <SelectItem value="" disabled>
                          Nessun ruolo disponibile per l'invito
                        </SelectItem>
                      )}
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

            {/* Messaggio personalizzato (opzionale) */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Messaggio personalizzato (opzionale)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Aggiungi un messaggio di benvenuto personalizzato..."
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
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
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Invia Invito
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
