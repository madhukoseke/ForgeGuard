import { NextResponse } from "next/server";
import { store } from "@/lib/store";

// POST /api/trail  — demo controls.  Body: { cmd: "seed" | "reset" }
export async function POST(req: Request) {
  let body: { cmd?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (body.cmd === "seed") store.seed();
  else if (body.cmd === "reset") store.reset();
  else return NextResponse.json({ error: `unknown cmd: ${body.cmd}` }, { status: 422 });

  return NextResponse.json({ actions: store.list() });
}
