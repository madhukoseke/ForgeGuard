# MCP and HTTP response examples

Representative payloads from the guard pipeline (MCP tools mirror HTTP `/api/guard/*` bodies).

## query — success (applied)

```json
{
  "status": "applied",
  "action_id": "a1b2c3d4-…",
  "rows": [{ "id": "…", "email": "ada@example.com", "last_login": "2026-06-12T…" }],
  "row_count": 1,
  "truncated": false,
  "redacted_cells": 0,
  "masked_cells": 0,
  "injection_findings": []
}
```

HTTP: `200`

## query — policy denied

```json
{
  "status": "rejected",
  "action_id": "…",
  "error": "Query denied by policy: table \"api_keys\" is not allowed",
  "injection_findings": []
}
```

HTTP: `400`

## query — inbound injection blocked

```json
{
  "status": "rejected",
  "action_id": "…",
  "error": "Blocked inbound prompt-injection pattern before query execution",
  "injection_findings": [
    {
      "direction": "inbound",
      "severity": "high",
      "pattern": "instruction_override",
      "snippet": "ignore previous instructions"
    }
  ]
}
```

HTTP: `400`

## query — outbound redaction

Result rows may contain `[FORGEGUARD:REDACTED]` in poisoned cells; `redacted_cells` > 0 and findings include `direction: "outbound"`.

## execute — pending (destructive SQL)

```json
{
  "status": "pending",
  "action_id": "…",
  "severity": "high",
  "category": "data_loss",
  "rationale": "Dropping a column permanently removes data from every row.",
  "safer_alternative": "ALTER TABLE users ADD COLUMN deleted_at timestamptz;",
  "requires_approval": true,
  "injection_findings": []
}
```

HTTP: `202`

## execute — applied (safe migration)

```json
{
  "status": "applied",
  "action_id": "…",
  "severity": "safe",
  "category": "benign",
  "requires_approval": false,
  "injection_findings": []
}
```

HTTP: `200`

## execute — rejected (policy)

```json
{
  "status": "rejected",
  "action_id": "…",
  "error": "Statement class \"grant\" is not allowed by policy",
  "injection_findings": []
}
```

HTTP: `400`

## get_action_status — after approve

```json
{
  "id": "…",
  "status": "applied",
  "severity": "high",
  "reviewed_by": "operator",
  "rollback_ref": "ALTER TABLE users ADD COLUMN last_login timestamptz;"
}
```

## get_action_status — after rollback

```json
{
  "id": "…",
  "status": "rolled_back",
  "severity": "safe",
  "reviewed_by": "operator"
}
```

## get_action_status — rejected

```json
{
  "id": "…",
  "status": "rejected",
  "severity": "critical",
  "reviewed_by": "operator",
  "rationale": "Operator rejected destructive DROP TABLE"
}
```

See also [API_STABILITY.md](../API_STABILITY.md) and [openapi.yaml](../openapi.yaml).
