"use client";

import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AtSign, Check, Copy, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

const LOCAL_PART_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;

const formSchema = z.object({
  firstName: z.string().min(1, "Nome richiesto").max(60),
  lastName: z.string().min(1, "Cognome richiesto").max(60),
  localPart: z
    .string()
    .min(1, "Nome casella richiesto")
    .regex(
      LOCAL_PART_PATTERN,
      "Usa minuscole, numeri e . _ - (non a inizio o fine)",
    ),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateMailboxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function CreateMailboxDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateMailboxDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [domain, setDomain] = useState("wearerighello.com");
  const [result, setResult] = useState<{
    email: string;
    tempPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { firstName: "", lastName: "", localPart: "" },
  });

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setCopied(false);
    form.reset();
    fetch("/api/team/create-mailbox", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.domain) setDomain(data.domain);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const suggestLocalPart = () => {
    const { firstName, lastName, localPart } = form.getValues();
    if (localPart || !firstName || !lastName) return;
    const normalize = (value: string) =>
      value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")        .replace(/[^a-z0-9]+/g, "");
    const suggestion = `${normalize(firstName)}.${normalize(lastName)}`;
    if (LOCAL_PART_PATTERN.test(suggestion)) {
      form.setValue("localPart", suggestion);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/team/create-mailbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data?.error || "Creazione casella fallita");
        return;
      }
      setResult({ email: data.email, tempPassword: data.tempPassword });
      toast.success(`Casella ${data.email} creata`);
      onCreated?.();
    } catch {
      toast.error("Errore di rete durante la creazione della casella");
    } finally {
      setSubmitting(false);
    }
  };

  const copyCredentials = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(
        `Email: ${result.email}\nPassword temporanea: ${result.tempPassword}`,
      );
      setCopied(true);
      toast.success("Credenziali copiate negli appunti");
    } catch {
      toast.error("Copia non riuscita");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Crea email aziendale
          </DialogTitle>
          <DialogDescription>
            Crea una nuova casella Zoho Mail con dominio @{domain}. La password
            temporanea va cambiata al primo accesso.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription className="space-y-2">
                <p>
                  Casella creata: <strong>{result.email}</strong>
                </p>
                <p>
                  Password temporanea:{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                    {result.tempPassword}
                  </code>
                </p>
                <p className="text-sm text-muted-foreground">
                  Consegnala alla persona: viene mostrata solo ora e dovrà
                  essere cambiata al primo login su mail.zoho.eu.
                </p>
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button variant="outline" onClick={copyCredentials}>
                {copied ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                Copia credenziali
              </Button>
              <Button onClick={() => onOpenChange(false)}>Chiudi</Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Fatin"
                          {...field}
                          onBlur={() => {
                            field.onBlur();
                            suggestLocalPart();
                          }}
                        />
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
                        <Input
                          placeholder="Lachhab"
                          {...field}
                          onBlur={() => {
                            field.onBlur();
                            suggestLocalPart();
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="localPart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indirizzo email</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            className="pl-9"
                            placeholder="nome.cognome"
                            {...field}
                          />
                        </div>
                        <span className="whitespace-nowrap text-sm text-muted-foreground">
                          @{domain}
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Minuscole, numeri e . _ - (non a inizio o fine).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={submitting}
                >
                  Annulla
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Crea casella
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
