# Antigravity Development Protocol

## Architecture & Responsibility Split
- **Claude (Conductor):** High-level architecture, complex logic, edge cases, integration, diff review, and independent test verification.
- **Gemini / `agy` (Executor):** Scaffolding, boilerplate generation, exhaustive test authoring, broad migrations, and large research tasks.

## When to Delegate to Gemini
Delegate when tasks involve heavy raw token generation or broad document scanning:
- Writing new boilerplate or scaffolding multi-file features.
- Generating extensive unit or integration test suites.
- Large-scale refactoring or mass codebase migrations.
- Deep web research or searching internal knowledge bases (Vertex AI Search).

## When NOT to Delegate
Keep execution directly in Claude for:
- Small, single-line or single-function edits.
- Nuanced architectural decisions and bug root-cause analysis.
- Quick, one-off fixes where the CLI round-trip overhead exceeds token savings.

## Plugin Slash Commands

| Command | Purpose |
| :--- | :--- |
| `/antigravity:setup` | Run environment doctor check (`agy` installation and authentication). |
| `/antigravity:delegate [--tier flash\|pro] <task>` | Offload code generation or boilerplate tasks to Gemini, followed by Claude's verification. |
| `/antigravity:review [--adversarial]` | Request Gemini to review the current git diff before Claude reconciles findings. |
| `/antigravity:research <topic>` | Let Gemini run grounded web/doc search; Claude corroborates findings across sources. |
| `/antigravity:status [id]` / `:result <id>` / `:cancel <id>` | Manage background task execution during interactive sessions. |

Tier mapping lives in `~/.claude/settings.json` under `env` (`CLAUDE_PLUGIN_OPTION_TIER_FLASH`, `_FLASH_LO`, `_PRO`). If `agy-doctor` reports a tier model missing, the plan's model lineup changed — remap there against `agy models`.

## Execution & Cost Discipline Rules for Claude

1. **Verification Gate (Mandatory):**
   - Never assume Gemini's generated code works just because it reports success.
   - Claude must independently inspect git diffs, run the build/typecheck command, and execute tests (`npm test`, `pytest`, etc.) before presenting the result to the user.
2. **Context Window Preservation:**
   - Claude must digest summaries rather than dumping raw multi-thousand-line logs from `agy` into the active context.
   - Review file changes using `git diff` rather than re-reading entire source trees.
3. **Batch Over Chatter:**
   - Provide clear, self-contained, batched specifications when delegating tasks to `agy` to minimize unnecessary round-trips.
4. **Execution Mode:**
   - In interactive mode, long-running delegations can run as background jobs (`/antigravity:status`).
   - In headless mode (`claude -p`), run delegations synchronously.
