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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Loader2,
  Edit,
  Shield,
  User,
  Users,
  Crown,
  BriefcaseBusiness,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import type { User as UserType } from "@/lib/types";

const editUserSchema = z.object({
  firstName: z.string().min(1, "Nome è obbligatorio"),
  lastName: z.string().min(1, "Cognome è obbligatorio"),
  email: z.string().email("Inserisci un indirizzo email valido"),
  role: z.enum(
    [
      "super-admin",
      "admin",
      "direzione",
      "capo-reparto",
      "junior",
      "freelance",
      "client",
    ],
    {
      required_error: "Seleziona un ruolo",
    },
  ),
  companyName: z.string().optional(),
  assignedClientIds: z.array(z.string()).default([]),
  isSuspended: z.boolean().default(false),
});

type EditUserForm = z.infer<typeof editUserSchema>;

interface UserEditDialogProps {
  user: UserType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated?: () => void;
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
    value: "freelance" as const,
    label: "Freelance esterno",
    description: "Solo clienti, progetti e task assegnati",
    icon: BriefcaseBusiness,
  },
  {
    value: "client" as const,
    label: "Cliente",
    description: "Accesso solo al proprio workspace",
    icon: User,
  },
];

export function UserEditDialog({
  user,
  open,
  onOpenChange,
  onUserUpdated,
}: UserEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<
    Array<{ id: string; name: string; company?: string }>
  >([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState("");

  const form = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "junior",
      companyName: "",
      assignedClientIds: [],
      isSuspended: false,
    },
  });
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

  // Aggiorna i valori del form quando cambia l'utente
  useEffect(() => {
    if (user && open) {
      setClientSearch("");
      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        role: user.role || "junior",
        companyName: user.companyName || "",
        assignedClientIds: user.assignedClientIds || [],
        isSuspended: user.isSuspended || false,
      });
    }
  }, [user, open, form]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    async function loadClients() {
      setClientsLoading(true);
      try {
        const response = await fetch("/api/clients", { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(data.error || "Errore caricamento clienti");
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
          console.error("Error loading clients for user edit:", error);
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

  const onSubmit = async (data: EditUserForm) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/team/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore nell'aggiornamento utente");
      }

      toast.success("Utente aggiornato con successo");
      onUserUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore nell'aggiornamento utente",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88dvh] flex-col overflow-hidden sm:max-w-[760px]">
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
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 overflow-y-auto pr-1">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,1.1fr)]">
                <div className="space-y-4">
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
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona un ruolo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roleOptions.map((option) => {
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
                            Il freelance vedrà solo questi clienti, più
                            eventuali progetti o task in cui è coinvolto
                            direttamente.
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
                ) : (
                  "Salva Modifiche"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
