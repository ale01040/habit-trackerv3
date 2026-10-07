/** UUID v4; usa crypto.randomUUID quando disponibile (richiede contesto sicuro). */
export function newId(cryptoImpl: Partial<Crypto> | undefined = globalThis.crypto): string {
  if (cryptoImpl?.randomUUID) return cryptoImpl.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
