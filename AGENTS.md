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
