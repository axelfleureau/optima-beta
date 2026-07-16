"use client";

import { useCallback, useEffect, useState } from "react";

export type VrMember = { id: string; name: string; email: string | null };
export type VrClient = { id: string; name: string; company: string | null };
export type VrProject = {
  id: string;
  name: string;
  clientId: string | null;
  status: string;
};
export type VrCollaborator = {
  id: string;
  memberId: string;
  role: string;
  name: string;
  email: string | null;
};

/** Clienti (deduplicati) + membri del team: servono ai selettori ovunque. */
export function useVideoReviewMeta() {
  const [clients, setClients] = useState<VrClient[]>([]);
  const [members, setMembers] = useState<VrMember[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [canSeeAll, setCanSeeAll] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/video-review/meta")
      .then((r) => r.json())
      .then((r) => {
        if (!alive || !r?.ok) return;
        setClients(r.clients || []);
        setMembers(r.members || []);
        setMe(r.me || null);
        setCanSeeAll(Boolean(r.canSeeAll));
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return { clients, members, me, canSeeAll, loading };
}

/** Progetti del cliente (o tutti). Il progetto è per VIDEO, non un contenitore. */
export function useProjects(clientId?: string | null) {
  const [projects, setProjects] = useState<VrProject[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const qs = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
    return fetch(`/api/video-review/projects${qs}`)
      .then((r) => r.json())
      .then((r) => r?.ok && setProjects(r.projects || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (name: string) => {
      const r = await fetch("/api/video-review/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, clientId: clientId || null }),
      })
        .then((r) => r.json())
        .catch(() => ({ ok: false }));
      if (r?.ok) {
        setProjects((p) => [r.project, ...p]);
        return r.project as VrProject;
      }
      return null;
    },
    [clientId],
  );

  return { projects, loading, reload: load, create };
}

/** Collaboratori di una tranche o di un singolo video (la delega). */
export function useCollaborators(
  scope: "tranche" | "video",
  scopeId: string | null,
) {
  const [collaborators, setCollaborators] = useState<VrCollaborator[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!scopeId) {
      setCollaborators([]);
      setLoading(false);
      return Promise.resolve();
    }
    setLoading(true);
    return fetch(
      `/api/video-review/collaborators?scope=${scope}&scopeId=${encodeURIComponent(scopeId)}`,
    )
      .then((r) => r.json())
      .then((r) => r?.ok && setCollaborators(r.collaborators || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [scope, scopeId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = useCallback(
    async (memberId: string, role: string) => {
      await fetch("/api/video-review/collaborators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, scopeId, memberId, role }),
      }).catch(() => {});
      return load();
    },
    [scope, scopeId, load],
  );

  const remove = useCallback(
    async (id: string) => {
      await fetch(
        `/api/video-review/collaborators?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      ).catch(() => {});
      return load();
    },
    [load],
  );

  return { collaborators, loading, add, remove, reload: load };
}
