/** LLM copy often leans on em dashes. Real Outlook mail almost never does. */
export function withoutEmDashes(text: string): string {
  return text.replace(/\s*[\u2014\u2013]\s*/g, ", ");
}

export function withoutEmDashesDeep<T>(value: T): T {
  if (typeof value === "string") return withoutEmDashes(value) as T;
  if (Array.isArray(value)) {
    return value.map((item) => withoutEmDashesDeep(item)) as T;
  }
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      next[key] = withoutEmDashesDeep(item);
    }
    return next as T;
  }
  return value;
}
