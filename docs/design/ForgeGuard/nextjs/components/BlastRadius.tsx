import type { Severity } from "@/lib/types";
import { sevVars } from "./severity";

/** Qualitative blast-radius mini-viz: fills 0–5 bars from the severity + text. */
export function BlastRadius({ value, sev }: { value: string; sev: Severity }) {
  const unknown = /unknown/i.test(value);
  let filled = 1;
  if (/all|every|tenant/i.test(value)) filled = 5;
  else if (/12,?480|thousand/i.test(value)) filled = 5;
  else if (/blocked|public|table|payments/i.test(value)) filled = 4;
  else if (/\b[1-9]\d*\b/.test(value)) {
    const num = parseInt(value.replace(/,/g, ""), 10);
    filled = num === 0 ? 0 : num < 10 ? 2 : num < 1000 ? 3 : 5;
  } else if (/non-?blocking|1 function/i.test(value)) filled = 1;

  return (
    <span className="blast" style={sevVars(sev)}>
      <span className="dots">
        {Array.from({ length: 5 }).map((_, i) => (
          <i key={i} className={i < filled ? "" : "empty"} />
        ))}
      </span>
      {unknown ? <span className="unknown">unknown</span> : value}
    </span>
  );
}
