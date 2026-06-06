const baseUrl = process.env.FORGEGUARD_BASE_URL ?? "http://localhost:3000";
const token = process.env.FORGEGUARD_OPERATOR_TOKEN;

const headers: Record<string, string> = {
  "content-type": "application/json",
};

if (token) headers["x-forgeguard-token"] = token;

async function main() {
  const resp = await fetch(`${baseUrl.replace(/\/$/, "")}/api/demo`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "seed_all" }),
  });

  const body = await resp.text();
  if (!resp.ok) {
    throw new Error(`Seed failed with ${resp.status}: ${body}`);
  }

  console.log(body);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export {};
