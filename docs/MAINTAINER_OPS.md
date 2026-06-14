# Maintainer operations

## GitHub settings (before public launch)

Run `bash scripts/setup-github.sh` (requires `gh auth login`), then:

- [ ] Enable **Private vulnerability reporting** (Settings → Security)
- [ ] Protect `main`: require PR, require status checks (`CI`, `Secret scan`)
- [ ] Require at least one approving review
- [ ] Disable force-push to `main`

## npm publishing

- [ ] Enable **2FA** on npm publisher accounts
- [ ] Create `NPM_TOKEN` for CI release workflow
- [ ] Verify package name `forgeguard` availability before first publish

## Triage

| Type | Action | SLA |
|------|--------|-----|
| Security advisory | Acknowledge via GitHub private reporting | 72h |
| Bug | Label `bug`, reproduce, fix or document | Best effort |
| Feature | Label `enhancement`, discuss in issue | Roadmap |

## Release

Follow [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md).

## DCO / signed commits

Optional — not required today. Enable if the project adopts Developer Certificate of Origin later.
