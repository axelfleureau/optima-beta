"use client";

type UploadResult = {
  fps?: number;
  durationSeconds?: number;
  width?: number;
  height?: number;
};

type UploadOptions = {
  url: string;
  file: File;
  onProgress?: (progress: number) => void;
};

type PreparedUpload = {
  uploadMode?: "node_put" | "r2_multipart";
  uploadUrl?: string | null;
  uploadId?: string | null;
  videoId: string;
  partSize?: number;
};

const LARGE_VIDEO_WARNING_BYTES = 95 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 45 * 60 * 1000;
const PROXIED_VIDEO_HOST = "video.wearerighello.com";

function assertUploadUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) {
      throw new Error("protocollo non valido");
    }
    return parsed;
  } catch {
    throw new Error(
      "URL di upload non valido generato dal nodo video. Ricarica la pagina e riprova.",
    );
  }
}

function parseNodeResponse(xhr: XMLHttpRequest) {
  const body = String(xhr.responseText || "");
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function nodeUploadError(xhr: XMLHttpRequest) {
  const payload = parseNodeResponse(xhr);
  const message = payload?.error ? String(payload.error) : "";
  if (xhr.status === 413) {
    return "Video troppo grande per il canale di upload attuale. Esporta nella cartella monitorata dal nodo o riduci il file.";
  }
  if (xhr.status === 401 || xhr.status === 403) {
    return "Link di upload scaduto o non valido. Riprova il caricamento.";
  }
  if (xhr.status >= 500) {
    return "Il nodo video ha risposto con errore interno. Riprova tra poco o verifica che il nodo sia operativo.";
  }
  return (
    message ||
    `Upload non riuscito sul nodo video (${xhr.status || "nessuno status"}).`
  );
}

export function uploadVideoFileToNode({
  url,
  file,
  onProgress,
}: UploadOptions): Promise<UploadResult> {
  const uploadUrl = assertUploadUrl(url);

  if (
    uploadUrl.hostname === PROXIED_VIDEO_HOST &&
    file.size >= LARGE_VIDEO_WARNING_BYTES
  ) {
    return Promise.reject(
      new Error(
        "Questo video supera il limite del canale web attuale verso il nodo. Per file grandi serve upload diretto/chunked: usa temporaneamente la cartella monitorata del nodo o esporta un file sotto 95 MB.",
      ),
    );
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl.toString());
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      const payload = parseNodeResponse(xhr);
      if (xhr.status >= 200 && xhr.status < 300 && payload?.ok) {
        resolve(payload);
        return;
      }
      reject(new Error(nodeUploadError(xhr)));
    };
    xhr.onerror = () => {
      const suffix =
        file.size >= LARGE_VIDEO_WARNING_BYTES
          ? " Se il file e grande, il proxy puo interrompere la richiesta: in quel caso usa la cartella monitorata dal nodo o un export piu leggero."
          : "";
      reject(
        new Error(
          `Errore di rete verso il nodo video. Verifica connessione, VPN/rete aziendale e raggiungibilita di video.wearerighello.com.${suffix}`,
        ),
      );
    };
    xhr.ontimeout = () => {
      reject(
        new Error(
          "Upload scaduto: il nodo non ha completato il caricamento entro il tempo massimo.",
        ),
      );
    };
    xhr.onabort = () => reject(new Error("Upload annullato."));
    xhr.send(file);
  });
}

async function readLocalVideoMetadata(file: File): Promise<UploadResult> {
  if (typeof document === "undefined") return {};
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const cleanup = () => URL.revokeObjectURL(url);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const result = {
        durationSeconds: Number.isFinite(video.duration)
          ? video.duration
          : undefined,
        width: video.videoWidth || undefined,
        height: video.videoHeight || undefined,
      };
      cleanup();
      resolve(result);
    };
    video.onerror = () => {
      cleanup();
      resolve({});
    };
    video.src = url;
  });
}

async function uploadVideoFileToR2Multipart({
  prepared,
  file,
  onProgress,
}: {
  prepared: PreparedUpload;
  file: File;
  onProgress?: (progress: number) => void;
}): Promise<UploadResult> {
  const uploadId = prepared.uploadId;
  if (!uploadId) throw new Error("Upload multipart non inizializzato.");
  const partSize = Math.max(
    5 * 1024 * 1024,
    Number(prepared.partSize || 24 * 1024 * 1024),
  );
  const totalParts = Math.ceil(file.size / partSize);
  const parts: Array<{ part: number; etag: string }> = [];

  for (let index = 0; index < totalParts; index += 1) {
    const partNumber = index + 1;
    const start = index * partSize;
    const chunk = file.slice(start, Math.min(file.size, start + partSize));
    const response = await fetch(
      `/api/video-review/videos/${prepared.videoId}/multipart?uploadId=${encodeURIComponent(uploadId)}&partNumber=${partNumber}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: chunk,
      },
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      throw new Error(
        payload?.error || `Upload parte ${partNumber} non riuscito`,
      );
    }
    parts.push({ part: partNumber, etag: String(payload.part?.etag || "") });
    onProgress?.(Math.round((partNumber / totalParts) * 100));
  }

  const complete = await fetch(
    `/api/video-review/videos/${prepared.videoId}/multipart`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId, parts }),
    },
  );
  const completePayload = await complete.json().catch(() => null);
  if (!complete.ok || !completePayload?.ok) {
    throw new Error(
      completePayload?.error || "Completamento upload multipart non riuscito",
    );
  }

  return readLocalVideoMetadata(file);
}

export async function uploadPreparedVideo({
  prepared,
  file,
  onProgress,
}: {
  prepared: PreparedUpload;
  file: File;
  onProgress?: (progress: number) => void;
}) {
  if (prepared.uploadMode === "r2_multipart") {
    return uploadVideoFileToR2Multipart({ prepared, file, onProgress });
  }
  if (!prepared.uploadUrl) throw new Error("URL di upload mancante.");
  return uploadVideoFileToNode({ url: prepared.uploadUrl, file, onProgress });
}

export async function cleanupPreparedVideoUpload(prepared: PreparedUpload) {
  if (prepared.uploadMode === "r2_multipart" && prepared.uploadId) {
    await fetch(`/api/video-review/videos/${prepared.videoId}/multipart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "abort", uploadId: prepared.uploadId }),
    }).catch(() => {});
  }
  await fetch(`/api/video-review/videos/${prepared.videoId}`, {
    method: "DELETE",
  }).catch(() => {});
}
