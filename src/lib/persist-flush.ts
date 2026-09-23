type PersistFlush = () => Promise<string | null>;

let flushImpl: PersistFlush = async () => null;

/** Store registers the live flusher. Auth sign-out calls it before the JWT is cleared. */
export function registerPersistFlush(fn: PersistFlush): () => void {
  flushImpl = fn;
  return () => {
    if (flushImpl === fn) flushImpl = async () => null;
  };
}

export function flushPersistedWrites(): Promise<string | null> {
  return flushImpl();
}
