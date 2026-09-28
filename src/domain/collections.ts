/**
 * Agrupa elementos por clave conservando el orden de entrada. Equivale a
 * `Map.groupBy`, que no está disponible en Safari anterior a 17.4.
 */
export function groupBy<T, K>(
  items: Iterable<T>,
  getKey: (item: T) => K,
): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const key = getKey(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

export function byPosition(
  left: { position: number },
  right: { position: number },
): number {
  return left.position - right.position;
}

/** Copia solo las propiedades definidas, útil con `exactOptionalPropertyTypes`. */
export function pickDefined<T extends object, K extends keyof T>(
  source: T,
  keys: readonly K[],
): Partial<Pick<T, K>> {
  const result: Partial<Pick<T, K>> = {};
  for (const key of keys) {
    if (source[key] !== undefined) result[key] = source[key];
  }
  return result;
}
