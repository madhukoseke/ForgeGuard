# Operator token (admin auth)

Production ForgeGuard requires an operator token for protected API routes and dashboard mutations.

## Configuration

```env
FORGEGUARD_OPERATOR_TOKEN=<long-random-secret>
```

Generate a strong value (32+ bytes). In development, the token is optional; on Vercel or `NODE_ENV=production` it is **required**.

## Sending the token

Either header works:

```http
Authorization: Bearer <token>
```

```http
x-forgeguard-token: <token>
```

Comparison uses constant-time equality to reduce timing leaks.

## Dashboard behavior

1. On first protected request, the dashboard prompts for the token
2. Token is stored in **browser localStorage** (`forgeguard-operator-token`)
3. Subsequent requests include the token via [`components/dashboard/fetch.ts`](../components/dashboard/fetch.ts)

## Security expectations

- Treat the token like a root password for ForgeGuard mutations (approve, reject, rollback, demo seed)
- Do not commit the token to git or share in public issues
- XSS in the dashboard could exfiltrate localStorage — deploy only on trusted origins
- Rotate the token by updating env and clearing localStorage in browsers

## Protected routes

Includes `/api/actions/*` mutations, `/api/guard/*`, and `POST /api/demo`.

Public: `GET /api/health`, `GET /api/demo`, `GET /api/readiness` (advisory).

See [THREAT_MODEL.md](./THREAT_MODEL.md).
