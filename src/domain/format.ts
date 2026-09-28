const numberFormatter = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 2,
  useGrouping: false,
});

/** Número con coma decimal y sin separador de miles: 102,5. */
export function formatNumber(value: number | undefined): string {
  return value === undefined ? "" : numberFormatter.format(value);
}

/** Segundos como `m:ss` (o `h:mm:ss` a partir de una hora). */
export function formatDuration(totalSeconds: number | undefined): string {
  if (totalSeconds === undefined) return "";
  const rounded = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = String(rounded % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
}

/**
 * Lee un tiempo escrito como `m:ss`, `h:mm:ss`, solo minutos (`12`) o solo
 * cifras, porque el teclado numérico del móvil no tiene «:».
 * Devuelve `undefined` si está vacío y `null` si no se entiende.
 */
export function parseDuration(text: string): number | undefined | null {
  const trimmed = text.trim().replace(",", ".");
  if (trimmed === "") return undefined;
  // Solo cifras: `412` es 4:12 y `10205` es 1:02:05.
  if (/^\d{3,6}$/.test(trimmed)) {
    const seconds = trimmed.slice(-2);
    const minutes = trimmed.slice(-4, -2);
    const rest = trimmed.slice(0, -4);
    return parseDuration(
      trimmed.length <= 4
        ? `${trimmed.slice(0, -2)}:${seconds}`
        : `${rest}:${minutes}:${seconds}`,
    );
  }
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Math.round(Number(trimmed) * 60);
  const parts = trimmed.split(":");
  if (parts.length < 2 || parts.length > 3) return null;
  if (!parts.every((part) => /^\d+$/.test(part))) return null;
  const numbers = parts.map(Number);
  const seconds = numbers.at(-1) ?? 0;
  const minutes = numbers.at(-2) ?? 0;
  if (seconds >= 60 || (parts.length === 3 && minutes >= 60)) return null;
  const hours = parts.length === 3 ? (numbers[0] ?? 0) : 0;
  return hours * 3600 + minutes * 60 + seconds;
}

const weekdayFormatter = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  timeZone: "UTC",
});
const monthDayFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase("es-ES") + text.slice(1);
}

/** «Lunes 28» para la cabecera de la sesión. */
export function formatSessionTitle(localDate: string): string {
  return capitalize(
    weekdayFormatter.format(new Date(`${localDate}T00:00:00Z`)),
  );
}

/** «14 sep.» para listas compactas. */
export function formatShortDate(localDate: string): string {
  return monthDayFormatter.format(new Date(`${localDate}T00:00:00Z`));
}

export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}
