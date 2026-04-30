# ECC Agent-Sort Plan

- Date: 2026-04-22
- Repo: ultraman-monopoly (pnpm workspace: apps/web + apps/server + packages/shared)
- Stack: TS 5.6, React 18 + Vite 5 + Tailwind 3 + Zustand 5 + Dexie 4, Express 4 + better-sqlite3 11, Zod 3, Vitest 2 + Playwright 1.48, pnpm 10.33, Node >= 20, systemd + nginx + sqlite3 on Ubuntu
- Trigger: user asked to prune ~/.claude/ surface area to reduce per-session token cost
- Route chosen: A (uninstall ECC plugin, hand-pick DAILY set into ~/.claude/)

## Source of truth

ECC plugin cache was at ~/.claude/plugins/cache/everything-claude-code/everything-claude-code/1.10.0 (48 agents, 183 skills, 27 hooks). rules/*/*.md were not loaded into the system prompt by the SessionStart hook, so they are out of scope for token savings.

## DAILY set copied to user scope

### ~/.claude/agents/ (17)

architect, code-architect, code-explorer, code-reviewer, code-simplifier,
comment-analyzer, typescript-reviewer, build-error-resolver,
performance-optimizer, planner, pr-test-analyzer, refactor-cleaner,
security-reviewer, silent-failure-hunter, tdd-guide, type-design-analyzer,
e2e-runner

### ~/.claude/skills/ (23)

frontend-patterns, frontend-design, design-system, api-design, backend-patterns,
coding-standards, tdd-workflow, e2e-testing, browser-qa, git-workflow,
github-ops, verification-loop, security-review, security-scan,
documentation-lookup, codebase-onboarding, click-path-audit, repo-scan, ck,
safety-guard, search-first, configure-ecc, agent-sort

## LIBRARY (stayed in plugin cache, now dormant after uninstall)

31 agents + 161 skills stayed only in the plugin cache (now removed). To re-access any LIBRARY item later: `/plugin install everything-claude-code` then copy the specific skill/agent back here.

## Hooks

Not re-registered. Plugin provided 27 hooks; for a solo LAN project the local quality gate is `pnpm run ci` (typecheck + lint + test + check:terms) and GitHub Actions. High-friction hooks explicitly dropped: gateguard-fact-force, observe:continuous-learning, mcp-health-check, suggest-compact, governance-capture, evaluate-session, desktop-notify.

## Reversal

- Re-add plugin: `/plugin install everything-claude-code` (re-populates cache; enabledPlugins entry will reappear on install)
- Or just flip enabledPlugins["everything-claude-code@everything-claude-code"] back to true in ~/.claude/settings.json if the cache is still present
- The hand-picked user-scope items in ~/.claude/agents/ and ~/.claude/skills/ are independent of the plugin state, so they survive either action
