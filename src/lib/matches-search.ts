
export function matchesSearch<T>(
  item: T,
  query: string,
  fields: Array<(item: T) => string>
) {
  const q = query.trim().toLowerCase();
  return fields.some((field) => field(item).toLowerCase().includes(q));
}