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
import { Mail, Loader2, UserPlus, Building, Phone, MapPin } from "lucide-react"
import { toast } from "sonner"

const normalizeEmailValue = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : value

const requiredEmail = z.preprocess(
  normalizeEmailValue,
  z.string().min(1, "Email è obbligatoria").email("Inserisci un indirizzo email valido"),
)

const optionalEmail = z.preprocess(
  normalizeEmailValue,
  z.union([z.literal(""), z.string().email("Inserisci un indirizzo email valido")]).optional(),
)

const clientSchema = z.object({
  name: z.string().min(1, "Nome è obbligatorio"),
  email: requiredEmail,
  phone: z.string().optional(),
  company: z.string().optional(),
  industry: z.string().optional(),
  contactEmail: optionalEmail,
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(["active", "inactive", "prospect", "suspended"], {
    required_error: "Seleziona uno stato",
  }),
})

type ClientForm = z.infer<typeof clientSchema>

interface ClientFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const statusOptions = [
  {
    value: "prospect" as const,
    label: "Prospect",
    description: "Potenziale cliente in valutazione",
  },
  {
    value: "active" as const,
    label: "Attivo",
    description: "Cliente con progetti attivi",
  },
  {
    value: "inactive" as const,
    label: "Inattivo",
    description: "Cliente temporaneamente non attivo",
  },
]

const industryOptions = [
  "Tecnologia",
  "Marketing",
  "Consulenza",
  "E-commerce",
  "Manifatturiero",
  "Servizi Finanziari",
  "Sanità",
  "Educazione",
  "Retail",
  "Immobiliare",
  "Altro",
]

export function ClientFormDialog({ open, onOpenChange }: ClientFormDialogProps) {
  const { userData } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      industry: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      status: "prospect",
    },
  })

  const onSubmit = async (data: ClientForm) => {
    if (!userData) {
      toast.error("Errore di autenticazione")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/clients/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          tenantId: userData.tenantId,
        }),
      })

      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Errore nella creazione del cliente")
        } else {
          throw new Error("Errore nella creazione del cliente")
        }
      }

      // Only parse JSON if response has content and is JSON
      const contentType = response.headers.get("content-type")
      if (response.status !== 204 && contentType && contentType.includes("application/json")) {
        const result = await response.json()
      }
      
      toast.success(`Cliente ${data.name} creato con successo`)
      
      // Reset form and close dialog
      form.reset()
      onOpenChange(false)
      
      // TODO: Replace with local state refresh instead of full page reload

    } catch (error) {
      console.error("Error creating client:", error)
      toast.error(error instanceof Error ? error.message : "Errore nella creazione del cliente")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            Nuovo Cliente
          </DialogTitle>
          <DialogDescription>
            Aggiungi un nuovo cliente alla tua piattaforma
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Nome e Email */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome/Ragione Sociale *</FormLabel>
                    <FormControl>
                      <Input placeholder="Mario Rossi / Azienda SpA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input 
                          {...field}
                          placeholder="cliente@example.com" 
                          className="pl-10"
                          inputMode="email"
                          autoCapitalize="none"
                          autoCorrect="off"
                          onBlur={(event) => {
                            const value = event.target.value.trim().toLowerCase()
                            field.onChange(value)
                            field.onBlur()
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Telefono e Azienda */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefono</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input 
                          placeholder="+39 123 456 7890" 
                          className="pl-10"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Azienda</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input 
                          placeholder="Nome azienda" 
                          className="pl-10"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Settore e Stato */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Settore</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona settore" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {industryOptions.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stato *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona stato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="text-xs text-gray-500">{option.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Email di Contatto e Telefono Contatto */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email di Contatto</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input 
                          {...field}
                          placeholder="contatto@azienda.com" 
                          className="pl-10"
                          inputMode="email"
                          autoCapitalize="none"
                          autoCorrect="off"
                          onBlur={(event) => {
                            const value = event.target.value.trim().toLowerCase()
                            field.onChange(value)
                            field.onBlur()
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefono di Contatto</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input 
                          placeholder="+39 123 456 7890" 
                          className="pl-10"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Indirizzo */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Indirizzo</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
                      <Textarea 
                        placeholder="Via Roma 123, 00100 Roma RM"
                        rows={2}
                        className="pl-10"
                        {...field} 
                      />
                    </div>
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
                    Creazione in corso...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Crea Cliente
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
