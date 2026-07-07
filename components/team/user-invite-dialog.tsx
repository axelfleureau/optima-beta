"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/lib/auth-context";
import {
  Mail,
  Loader2,
  UserPlus,
  Shield,
  User,
  Users,
  Crown,
  Settings,
  UserCheck,
  BriefcaseBusiness,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { getManageableRoles } from "@/lib/role-hierarchy";

const inviteUserSchema = z
  .object({
    email: z.string().trim().optional(),
    firstName: z.string().min(1, "Nome è obbligatorio"),
    lastName: z.string().min(1, "Cognome è obbligatorio"),
    role: z.enum(
      ["admin", "direzione", "capo-reparto", "junior", "freelance", "client"],
      {
        required_error: "Seleziona un ruolo",
      },
    ),
    companyName: z.string().optional(),
    assignedClientIds: z.array(z.string()).default([]),
    message: z.string().optional(),
    sendInvite: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    const email = data.email?.trim() || "";
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (data.sendInvite && !email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "L'email è obbligatoria per inviare un invito",
      });
    }

    if (email && !validEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Inserisci un indirizzo email valido",
      });
    }
  });

type InviteUserForm = z.infer<typeof inviteUserSchema>;

interface UserInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited?: () => void | Promise<void>;
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
    description: "Operatività su task, presenze e rapportini assegnati",
    icon: User,
  },
  {
    value: "freelance" as const,
    label: "Freelance esterno",
    description: "Accesso solo a clienti, progetti e task assegnati",
    icon: BriefcaseBusiness,
  },
  {
    value: "client" as const,
    label: "Cliente",
    description: "Accesso cliente a lavori, task e avanzamenti",
    icon: Users,
  },
];

export function UserInviteDialog({
  open,
  onOpenChange,
  onInvited,
}: UserInviteDialogProps) {
  const { userData } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<
    Array<{ id: string; name: string; company?: string }>
  >([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState("");

  // Get roles that current user can manage based on hierarchy
  const manageableRoles = userData?.role
    ? getManageableRoles(userData.role as any)
    : [];

  // Filter role options based on what current user can manage
  const availableRoleOptions = roleOptions.filter((role) =>
    manageableRoles.includes(role.value as any),
  );

  const form = useForm<InviteUserForm>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: "junior",
      companyName: "",
      assignedClientIds: [],
      message: "",
      sendInvite: true,
    },
  });

  const sendInvite = form.watch("sendInvite");
  const selectedRole = form.watch("role");
  const assignedClientIds = form.watch("assignedClientIds") || [];
  const visibleClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();
    const assigned = new Set(assignedClientIds);
    return clients
      .filter((client) => {
        if (!query) return true;
        return `${client.name} ${client.company || ""}`
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        if (query) return a.name.localeCompare(b.name, "it");
        const aSelected = assigned.has(a.id);
        const bSelected = assigned.has(b.id);
        if (aSelected !== bSelected) return aSelected ? -1 : 1;
        return a.name.localeCompare(b.name, "it");
      });
  }, [assignedClientIds, clientSearch, clients]);

  useEffect(() => {
    if (!open) return;
    setClientSearch("");

    let cancelled = false;
    async function loadClients() {
      setClientsLoading(true);
      try {
        const response = await fetch("/api/clients", { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Errore caricamento clienti");
        }
        if (!cancelled) {
          setClients(
            (data.clients || []).map((client: any) => ({
              id: String(client.id),
              name: String(client.name || client.company || "Cliente"),
              company: client.company || "",
            })),
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error loading clients for user invite:", error);
          toast.error("Errore nel caricamento clienti");
        }
      } finally {
        if (!cancelled) setClientsLoading(false);
      }
    }

    loadClients();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const toggleClientAssignment = (clientId: string, checked: boolean) => {
    const current = form.getValues("assignedClientIds") || [];
    form.setValue(
      "assignedClientIds",
      checked
        ? Array.from(new Set([...current, clientId]))
        : current.filter((id) => id !== clientId),
      { shouldDirty: true },
    );
  };

  const onSubmit = async (data: InviteUserForm) => {
    if (!userData) {
      toast.error("Errore di autenticazione");
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = data.sendInvite ? "/api/team/invite" : "/api/team/users";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          assignedClientIds:
            data.role === "freelance" ? data.assignedClientIds : [],
          inviterName: `${userData.firstName} ${userData.lastName}`,
          inviterEmail: userData.email,
          tenantId: userData.tenantId,
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Errore nell'invito utente");
        } else {
          throw new Error("Errore nell'invito utente");
        }
      }

      // Only parse JSON if response has content and is JSON
      const contentType = response.headers.get("content-type");
      const result =
        response.status !== 204 &&
        contentType &&
        contentType.includes("application/json")
          ? await response.json()
          : null;

      toast.success(
        result?.message ||
          (data.sendInvite
            ? `Invito inviato con successo a ${data.email}`
            : `Membro aggiunto senza invito`),
      );
      await onInvited?.();

      // Reset form and close dialog
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error inviting user:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore nell'invio dell'invito",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (availableRoleOptions.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88dvh] flex-col overflow-hidden sm:max-w-[820px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            Aggiungi membro team
          </DialogTitle>
          <DialogDescription>
            Crea l'anagrafica del dipendente subito e decidi se invitarlo ora o
            più avanti.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 overflow-y-auto pr-1">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(340px,1.1fr)]">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="sendInvite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Accesso piattaforma</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={() => field.onChange(true)}
                              className={`rounded-lg border p-3 text-left transition ${
                                field.value
                                  ? "border-righello-pink bg-righello-pink/10 text-slate-950 dark:text-white"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300"
                              }`}
                            >
                              <span className="flex items-center gap-2 text-sm font-semibold">
                                <Mail className="h-4 w-4" />
                                Invita ora
                              </span>
                              <span className="mt-1 block text-xs opacity-75">
                                Crea membro e invia email di accesso.
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => field.onChange(false)}
                              className={`rounded-lg border p-3 text-left transition ${
                                !field.value
                                  ? "border-cyan-400 bg-cyan-400/10 text-slate-950 dark:text-white"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300"
                              }`}
                            >
                              <span className="flex items-center gap-2 text-sm font-semibold">
                                <UserCheck className="h-4 w-4" />
                                Solo anagrafica
                              </span>
                              <span className="mt-1 block text-xs opacity-75">
                                Aggiungi il dipendente e invitalo dopo.
                              </span>
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Email{sendInvite ? "" : " (opzionale)"}
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                              placeholder={
                                sendInvite
                                  ? "utente@example.com"
                                  : "Aggiungila ora o più avanti"
                              }
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
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona un ruolo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableRoleOptions.length > 0 ? (
                              availableRoleOptions.map((option) => {
                                const Icon = option.icon;
                                return (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Icon className="h-4 w-4" />
                                      <div>
                                        <div className="font-medium">
                                          {option.label}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {option.description}
                                        </div>
                                      </div>
                                    </div>
                                  </SelectItem>
                                );
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

                  {sendInvite && (
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Messaggio personalizzato (opzionale)
                          </FormLabel>
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
                  )}
                </div>

                <div className="space-y-4">
                  {selectedRole === "freelance" && (
                    <FormField
                      control={form.control}
                      name="assignedClientIds"
                      render={() => (
                        <FormItem>
                          <FormLabel>Clienti assegnati al freelance</FormLabel>
                          <FormDescription>
                            Il freelance vedrà solo questi clienti, oltre a task
                            o progetti in cui viene coinvolto direttamente.
                          </FormDescription>
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                              value={clientSearch}
                              onChange={(event) =>
                                setClientSearch(event.target.value)
                              }
                              placeholder="Cerca cliente per nome o azienda..."
                              className="pl-10"
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{assignedClientIds.length} selezionati</span>
                            <span>
                              {visibleClients.length} di {clients.length}{" "}
                              clienti
                            </span>
                          </div>
                          <div className="max-h-[42dvh] overflow-y-auto rounded-lg border p-3">
                            {clientsLoading ? (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Caricamento clienti...
                              </div>
                            ) : visibleClients.length ? (
                              <div className="grid gap-2">
                                {visibleClients.map((client) => {
                                  const checked = assignedClientIds.includes(
                                    client.id,
                                  );
                                  return (
                                    <label
                                      key={client.id}
                                      className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 p-3 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                                    >
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(value) =>
                                          toggleClientAssignment(
                                            client.id,
                                            value === true,
                                          )
                                        }
                                        className="mt-0.5"
                                      />
                                      <span className="min-w-0">
                                        <span className="block truncate text-sm font-semibold">
                                          {client.name}
                                        </span>
                                        {client.company &&
                                        client.company !== client.name ? (
                                          <span className="block truncate text-xs text-gray-500">
                                            {client.company}
                                          </span>
                                        ) : null}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">
                                {clients.length
                                  ? "Nessun cliente trovato con questa ricerca."
                                  : "Nessun cliente disponibile."}
                              </p>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4 border-t pt-4">
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
                ) : sendInvite ? (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Invia Invito
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Aggiungi membro
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
