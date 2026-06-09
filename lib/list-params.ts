export const DEFAULT_ACTIONS_LIMIT = 100;
export const MAX_ACTIONS_LIMIT = 500;

export interface ParsedListParams {
  limit: number;
  offset: number;
}

export function parseListParams(
  searchParams: URLSearchParams,
): ParsedListParams {
  const rawLimit = parseInt(searchParams.get("limit") ?? "", 10);
  const rawOffset = parseInt(searchParams.get("offset") ?? "", 10);

  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), MAX_ACTIONS_LIMIT)
    : DEFAULT_ACTIONS_LIMIT;
  const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;

  return { limit, offset };
}
