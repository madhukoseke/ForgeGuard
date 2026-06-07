import { tokenizeSql } from "@/lib/sql";

const CLS: Record<string, string> = {
  kw: "tok-kw",
  id: "tok-id",
  str: "tok-str",
  num: "tok-num",
  com: "tok-com",
  punc: "tok-punc",
};

/** Renders a statement with lightweight SQL syntax highlighting. */
export function Sql({ code }: { code: string }) {
  const tokens = tokenizeSql(code);
  return (
    <>
      {tokens.map((tok, i) =>
        CLS[tok.t] ? (
          <span key={i} className={CLS[tok.t]}>
            {tok.v}
          </span>
        ) : (
          <span key={i}>{tok.v}</span>
        )
      )}
    </>
  );
}
