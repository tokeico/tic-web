<!-- intent-skills:start -->
## Skill Loading

Use the repository’s installed Intent. If it is unavailable, report the missing dependency instead of downloading a replacement.
Before editing files for a substantial task:
- Run `bun run intent list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `bun run intent load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

## Agent tab

Answered by a local model in Ollama through `POST /api/agent/chat`. Demo suggestions and the scripted responder live in `src/domain/agent.ts`; actions and chat requests live in `src/state/store.tsx`. See `docs/AGENT.md`.

## Verification

Run `bun test src/domain/demo.test.ts` for demo date and tour-action regressions, `bunx tsc --noEmit` for types, `bun --bun run check` for Biome, and `bun --bun run build` for the production build.

## Authentication

The protected `/_app` layout loads the signed-in member through `src/server/session.ts`. Browser API calls use same-origin `/api/*`; `src/server/api.ts` forwards cookies to runtime `API_ORIGIN` (with `PUBLIC_API_URL` as a local fallback). `/mcp` uses the same server-side proxy. Never move session tokens into browser storage or treat the frontend route guard as API authorization.

The "Connect your agent" panel (`src/components/ConnectAgent.tsx`, on the Account page) builds per-client MCP configs for `/mcp` and reads the tool list live via `tools/list`; the tools themselves are defined in `tic-api/src/mcp.ts`.

Account controls live in `src/screens/account.tsx`; new workspaces and invitation acceptance use real database memberships. Workspace switching rotates the session and reloads the app to clear workspace-local UI state. Sign-up is not KYC verification.
