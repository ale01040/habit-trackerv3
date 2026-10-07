export type BackendErrorCode =
  | 'auth_invalid'
  | 'auth_exists'
  | 'auth_weak_password'
  | 'auth_invalid_email'
  | 'not_authenticated'
  | 'duplicate_name'
  | 'not_found'
  | 'outside_window'
  | 'not_scheduled'
  | 'invalid_state'
  | 'invalid_input'
  | 'email_unavailable'
  | 'network'
  | 'unknown';

export const ERROR_MESSAGES: Record<BackendErrorCode, string> = {
  auth_invalid: 'Email o password non corretti',
  auth_exists: 'Esiste già un account con questa email',
  auth_weak_password: 'La password deve avere almeno 8 caratteri',
  auth_invalid_email: 'Email non valida',
  not_authenticated: 'Sessione scaduta, accedi di nuovo',
  duplicate_name: 'Esiste già un’abitudine con questo nome',
  not_found: 'Abitudine non trovata',
  outside_window: 'Non puoi modificare questo giorno',
  not_scheduled: 'Questa abitudine non è prevista in questo giorno',
  invalid_state: 'Operazione non valida in questo momento',
  invalid_input: 'Dati non validi',
  email_unavailable: 'Invio email non disponibile al momento: riprova più tardi',
  network: 'Nessuna connessione, riprova',
  unknown: 'Qualcosa è andato storto, riprova',
};

export class BackendError extends Error {
  readonly code: BackendErrorCode;

  constructor(code: BackendErrorCode, message: string = ERROR_MESSAGES[code]) {
    super(message);
    this.name = 'BackendError';
    this.code = code;
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof BackendError ? error.message : ERROR_MESSAGES.unknown;
}
