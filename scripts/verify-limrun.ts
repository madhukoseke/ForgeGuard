/**
 * Smoke-test Limrun credentials from .env.local.
 * Usage: npm run verify:limrun
 */
import { isLimrunConfigured, resolvePreviewUrl } from "../lib/limrun";

async function main() {
  if (!isLimrunConfigured()) {
    console.error("Set LIM_API_KEY or LIMRUN_INSTANCE_ID in .env.local");
    process.exit(1);
  }

  const org = process.env.LIMRUN_ORG_ID?.trim();
  if (org) console.log(`Org: ${org}`);

  console.log("Resolving Limrun preview URL…");
  const preview = await resolvePreviewUrl();
  if (!preview) {
    console.error("No preview URL returned (check LIM_API_KEY or LIMRUN_INSTANCE_ID)");
    process.exit(1);
  }

  console.log("OK");
  console.log(`  instance: ${preview.instanceId}`);
  console.log(`  preview:  ${preview.previewUrl}`);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`Limrun verify failed: ${msg}`);
  if (msg.includes("unauthenticated") || msg.includes("403")) {
    console.error(
      "\nTip: create an org API key at https://lim.run → Settings → API keys.\n" +
        "The org ID (org_…) is not the API key.",
    );
  }
  process.exit(1);
});
