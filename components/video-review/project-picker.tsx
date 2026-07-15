"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { useProjects } from "@/hooks/use-video-review";
import { plainInputClass } from "@/lib/video-review-ui";

const NONE = "__none__";

/**
 * Scelta (o creazione al volo) del progetto Optima.
 * Usato sulla tranche come DEFAULT e sul singolo video come OVERRIDE: nella
 * stessa consegna un video può stare su un progetto e un altro su un altro.
 */
export function ProjectPicker({
  clientId,
  value,
  onChange,
  placeholder = "Nessun progetto",
  inheritedLabel,
}: {
  clientId: string | null;
  value: string | null;
  onChange: (projectId: string | null) => void;
  placeholder?: string;
  /** Se il video eredita il progetto della consegna, mostralo come default. */
  inheritedLabel?: string | null;
}) {
  const { projects, create } = useProjects(clientId);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    const p = await create(n);
    setBusy(false);
    if (p) {
      onChange(p.id);
      setName("");
      setCreating(false);
    }
  }

  if (creating) {
    return (
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Nome nuovo progetto…"
          className={plainInputClass}
        />
        <Button size="sm" disabled={busy || !name.trim()} onClick={handleCreate}>
          {busy ? "…" : "Crea"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value || NONE}
        onValueChange={(v) => onChange(v === NONE ? null : v)}
      >
        <SelectTrigger className="h-9 border-white/10 bg-[#172235] text-slate-100">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="border-white/10 bg-[#111b2d] text-slate-100">
          <SelectItem value={NONE}>
            {inheritedLabel ? `Eredita: ${inheritedLabel}` : `— ${placeholder} —`}
          </SelectItem>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="outline"
        className="h-9 shrink-0 border-white/10 bg-white/5 hover:border-righello-pink/40"
        onClick={() => setCreating(true)}
        title="Crea un nuovo progetto"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
