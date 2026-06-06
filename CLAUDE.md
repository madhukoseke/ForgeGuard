# ForgeGuard — Agent Instructions

You are building or modifying an app whose backend runs on **InsForge**. You must
route every backend change through **ForgeGuard** before it applies.

## The rule

**Never** apply database migrations, deploy edge functions, change storage
buckets, or modify auth configuration directly on InsForge. Instead:

1. POST the proposed operation to ForgeGuard's chokepoint.
2. Wait for the verdict (`auto_allowed` or `pending`).
3. If `pending`, stop and ask the human operator to approve or reject in the
   dashboard (or via the review API).
4. Only after approval should the op be considered safe to apply.

## Chokepoint

```http
POST /api/guard/op
Content-Type: application/json

{
  "operation_type": "db.migration",
  "statement": "ALTER TABLE users DROP COLUMN last_login;",
  "agent": "claude-code",
  "session_id": "<your-session-id>",
  "target": "users",
  "context": {
    "table": "users",
    "row_count": 5,
    "has_rls": true,
    "environment": "production"
  }
}
```

`operation_type` must be one of:

- `db.migration`
- `function.deploy`
- `storage.config`
- `auth.config`

### Responses

- **200** — `status: "auto_allowed"`. Low-risk; logged but no human gate.
- **202** — `status: "pending"`, `requires_approval: true`. **Stop.** Surface
  `rationale`, `safer_alternative`, and `blast_radius` to the operator.

If `FORGEGUARD_OPERATOR_TOKEN` is set, include:

```http
Authorization: Bearer <token>
```

or `x-forgeguard-token: <token>`.

## When blocked, prefer the safer alternative

If ForgeGuard returns `safer_alternative`, propose that instead of the original
statement. Example: add `deleted_at` for soft-delete instead of `DROP COLUMN`.

## Review API (operator / human-in-the-loop)

```http
PATCH /api/actions/<id>
Content-Type: application/json

{ "decision": "approve", "reviewed_by": "operator" }
```

`decision` is `approve` | `reject` | `rollback`.

## InsForge backend work

For InsForge SDK usage, database schema, auth, storage, functions, and AI
gateway setup, follow [AGENTS.md](./AGENTS.md) and call the InsForge MCP
`fetch-docs` tool before writing integration code.

## Local development

```bash
npm run dev
```

Dashboard: `http://localhost:3000`

Seed demo actions: `npm run seed`
