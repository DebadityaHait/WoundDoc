const shortFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const longFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatShortDateTime(iso: string): string {
  return shortFormatter.format(new Date(iso));
}

export function formatLongDateTime(iso: string): string {
  return longFormatter.format(new Date(iso));
}
