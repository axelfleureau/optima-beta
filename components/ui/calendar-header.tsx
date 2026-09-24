"use client";

import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CalendarHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onNewPost: () => void;
  selectedClientId: string | null;
  onClientChange: (clientId: string | null) => void;
  clientOptions: Array<{ value: string; label: string }>;
  userRole?: string;
}

export function CalendarHeader({
  searchTerm,
  onSearchChange,
  onNewPost,
  selectedClientId,
  onClientChange,
  clientOptions,
  userRole,
}: CalendarHeaderProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-white/10 bg-[#10151f] p-3 lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          placeholder="Cerca post, piattaforme, caption..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-11 min-w-0 rounded-lg border-white/10 bg-[#0b0f17] pl-10 text-sm text-slate-100 shadow-none"
        />
      </div>

      {userRole !== "client" && (
        <div className="min-w-0 lg:w-60">
          <Select
            value={selectedClientId || "all"}
            onValueChange={(value) =>
              onClientChange(value === "all" ? null : value)
            }
          >
            <SelectTrigger className="h-11 min-w-0 rounded-lg border-white/10 bg-[#0b0f17] text-sm text-slate-100 shadow-none">
              <SelectValue placeholder="Seleziona cliente..." />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#0f131c] text-slate-100">
              <SelectItem value="all">Tutti i clienti</SelectItem>
              {clientOptions.map((client) => (
                <SelectItem key={client.value} value={client.value}>
                  {client.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center">
        <Button
          onClick={onNewPost}
          className="h-11 w-full rounded-lg bg-righello-pink px-5 text-sm font-semibold text-white shadow-none hover:bg-righello-pink/90 lg:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Crea post
        </Button>
      </div>
    </div>
  );
}
