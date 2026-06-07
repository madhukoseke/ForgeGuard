// ============================================================
// ForgeGuard — tiny SQL syntax highlighter (server-safe, no deps)
// Returns an array of tokens so the client renders <span> classes.
// ============================================================

export type SqlToken = { t: string; v: string };

const KEYWORDS = new Set(
  (
    "alter table drop column add truncate restart identity cascade create index concurrently on " +
    "update set where row level security disable enable grant insert delete to using policy " +
    "select from values into is not null default and or as references"
  ).split(" ")
);

const RE =
  /(--[^\n]*)|('(?:[^']|'')*')|(\b\d[\d,.]*\b)|([A-Za-z_][A-Za-z0-9_]*)|([(),.;=*<>]+)|(\s+)/g;

export function tokenizeSql(sql: string): SqlToken[] {
  const out: SqlToken[] = [];
  let m: RegExpExecArray | null;
  RE.lastIndex = 0;
  while ((m = RE.exec(sql))) {
    if (m[1]) out.push({ t: "com", v: m[1] });
    else if (m[2]) out.push({ t: "str", v: m[2] });
    else if (m[3]) out.push({ t: "num", v: m[3] });
    else if (m[4])
      out.push({ t: KEYWORDS.has(m[4].toLowerCase()) ? "kw" : "id", v: m[4] });
    else if (m[5]) out.push({ t: "punc", v: m[5] });
    else out.push({ t: "ws", v: m[0] });
  }
  return out;
}
