export const SESSION_REFRESH_MESSAGE =
  "Sessione da aggiornare: ricarica la pagina per continuare a lavorare.";

export class SessionAwareRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SessionAwareRequestError";
    this.status = status;
  }
}

export function isSessionExpiredStatus(status: number) {
  return status === 401 || status === 403;
}

export function isSessionExpiredError(error: unknown) {
  return (
    error instanceof SessionAwareRequestError &&
    isSessionExpiredStatus(error.status)
  );
}

export function humanizeSessionErrorMessage(message: unknown) {
  const text = String(message || "").trim();
  if (
    text === "Unauthorized" ||
    text === "Non autorizzato" ||
    text === "Non autenticato"
  ) {
    return SESSION_REFRESH_MESSAGE;
  }

  return text || "Operazione non riuscita";
}
