/** Prevent overwriting data changed since it was loaded, including deletion. */
export function writeSnapshot(storage: Storage, key: string, snapshot: string | null, value: string | null): string | null {
  if (storage.getItem(key) !== snapshot) {
    throw new Error("Les données ont changé dans un autre onglet. Rechargez avant d’enregistrer.");
  }
  if (value === null) storage.removeItem(key);
  else storage.setItem(key, value);
  return value;
}
