export interface FilterAndSortOptions<T> {
  query: string;
  normalizeFn?: (query: string) => string;
  filters?: ((item: T) => string)[];
  sortFn?: (a: T, b: T) => number;
  passIfQueryEmpty?: boolean;
}

export function filterAndSort<T>(
  items: T[],
  options: FilterAndSortOptions<T>
): T[] {
  const {
    query,
    normalizeFn = (q) => q.trim().toLowerCase(), // Default normalization function
    filters,
    sortFn,
    passIfQueryEmpty = true,
  } = options;

  const normalizedQuery = normalizeFn(query);

  const shouldSkipFiltering = passIfQueryEmpty && !normalizedQuery;

  let result = items;

  // Generate filter function based on provided filters and normalization function
  const filterFn = (item: T, query: string, filters: Array<(item: T) => string>) => {
    return filters.some((field) => normalizeFn(field(item)).includes(query));
  }

  result = shouldSkipFiltering
    ? result
    : filters
      ? result.filter((item) => filterFn(item, normalizedQuery, filters))
      : result;

  result = sortFn
    ? [...result].sort(sortFn)
    : result;

  return result;
}