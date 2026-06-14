/**
 * Capture dashboard screenshots for docs/assets/ (requires dev server on FORGEGUARD_BASE_URL).
 * Usage: npm run dev &  npm run capture:screenshots
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.FORGEGUARD_BASE_URL ?? "http://localhost:3000";
const OUT = join(process.cwd(), "docs", "assets");
const TOKEN = process.env.FORGEGUARD_OPERATOR_TOKEN;

async function api(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (TOKEN) headers["x-forgeguard-token"] = TOKEN;
  return fetch(`${BASE}${path}`, { ...init, headers });
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  await api("/api/demo", { method: "POST", body: JSON.stringify({ action: "reset" }) });
  await api("/api/demo", { method: "POST", body: JSON.stringify({ action: "seed_all" }) });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  if (TOKEN) {
    await page.goto(`${BASE}/dashboard`);
    await page.evaluate((t) => localStorage.setItem("forgeguard-operator-token", t), TOKEN);
  }

  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.screenshot({ path: join(OUT, "screenshot-pending.png"), fullPage: true });

  const actions = (await (await api("/api/actions?limit=20")).json()) as {
    actions?: { id: string; status: string; requires_approval?: boolean }[];
  };
  const pending = actions.actions?.find((a) => a.status === "pending");
  if (pending) {
    await api(`/api/actions/${pending.id}`, {
      method: "PATCH",
      body: JSON.stringify({ decision: "approve" }),
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.screenshot({ path: join(OUT, "screenshot-approved.png"), fullPage: true });
  }

  const destructive = actions.actions?.find(
    (a) => a.status === "pending" && a.requires_approval,
  );
  if (destructive) {
    await api(`/api/actions/${destructive.id}`, {
      method: "PATCH",
      body: JSON.stringify({ decision: "reject" }),
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.screenshot({ path: join(OUT, "screenshot-rejected.png"), fullPage: true });
  }

  const applied = actions.actions?.find((a) => a.status === "applied");
  if (applied) {
    await api(`/api/actions/${applied.id}`, {
      method: "PATCH",
      body: JSON.stringify({ decision: "rollback" }),
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.screenshot({ path: join(OUT, "screenshot-rollback.png"), fullPage: true });
  }

  await browser.close();
  console.log(`Screenshots saved to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export {};
