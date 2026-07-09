"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { Client } from "@/lib/types";
import {
  notifyOperationalDataChanged,
  useLiveRefresh,
} from "@/hooks/use-live-refresh";
import {
  humanizeSessionErrorMessage,
  isSessionExpiredError,
  isSessionExpiredStatus,
  SessionAwareRequestError,
} from "@/lib/session-error";

type ClientInput = {
  name: string;
  company?: string;
  email?: string;
  contactEmail?: string;
  status?: string;
};

async function parseClientResponse(response: Response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new SessionAwareRequestError(
      isSessionExpiredStatus(response.status)
        ? humanizeSessionErrorMessage(payload.error)
        : payload.error || "Operazione cliente non riuscita",
      response.status,
    );
  }

  return payload;
}

function normalizeClient(client: Client): Client {
  return {
    ...client,
    createdAt: client.createdAt
      ? new Date(client.createdAt as any)
      : new Date(),
    updatedAt: client.updatedAt
      ? new Date(client.updatedAt as any)
      : new Date(),
    lastActivity: client.lastActivity
      ? new Date(client.lastActivity as any)
      : undefined,
  };
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userData, loading: authLoading } = useAuth();
  const hasLoadedRef = useRef(false);

  const refreshClients = useCallback(async () => {
    if (authLoading) return;

    if (!userData?.tenantId) {
      setClients([]);
      setLoading(false);
      return;
    }

    setLoading(!hasLoadedRef.current);
    setError(null);

    try {
      const response = await fetch("/api/clients", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const payload = await parseClientResponse(response);
      setClients((payload.clients || []).map(normalizeClient));
    } catch (err) {
      console.error("Error fetching clients:", err);
      if (isSessionExpiredError(err) && hasLoadedRef.current) {
        return;
      }
      setError(
        err instanceof Error
          ? err.message
          : "Errore nel caricamento dei clienti",
      );
      setClients([]);
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
    }
  }, [authLoading, userData?.tenantId]);

  useEffect(() => {
    refreshClients();
  }, [refreshClients]);

  useLiveRefresh(refreshClients, {
    enabled: Boolean(userData?.tenantId && !authLoading),
    intervalMs: 30000,
  });

  const createClient = async (client: ClientInput) => {
    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(client),
      });

      const payload = await parseClientResponse(response);
      const createdClient = normalizeClient(payload.client);
      setClients((current) => [createdClient, ...current]);
      notifyOperationalDataChanged();
      return createdClient;
    } catch (err) {
      console.error("Error creating client:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Errore durante la creazione del cliente",
      );
      throw err;
    }
  };

  return {
    clients,
    loading,
    error,
    refreshClients,
    createClient,
  };
}
