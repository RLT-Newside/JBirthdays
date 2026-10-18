## Git Workflow

After every change:
1. Check for an existing unmerged branch (`git branch -r --no-merged main`). If one exists, switch to it and commit there.
2. If no unmerged branch exists, create a new branch using the conventional prefix that matches the change type:
   - `feat/short-description` — new feature
   - `fix/short-description` — bug fix
   - `refactor/short-description` — code restructure without behavior change
   - `chore/short-description` — tooling, config, deps
3. Always: `git add` relevant files → `git commit` → `git push` (once a remote exists)

Never commit directly to main.

## Pre-push Checks

Before every `git push`, run these and fix any failures:
1. `npx biome check src/` — must pass with 0 errors
2. `node node_modules/typescript/lib/tsc.js -b` — must compile clean
3. `npx vitest run` — all tests green

## Conventions (mirrors JGym)

- Storage: localStorage only, all keys `bday_*` registered in `src/data/storage.ts`; read/write via `useStorage`.
- Pages: `pages/<page>/<page>.container.tsx` (logic) + `<page>.view.tsx` (render); sub-components in `components/<name>/<name>.tsx`.
- Tests colocated as `*.test.ts(x)`. Pure logic lives in `src/utils/` and is unit tested.
- Share format (`src/utils/share.ts`) is versioned (`version: 1`); any change must stay readable by older links or bump the version. `parsePacket` treats every link/file as untrusted.
- Notes and gift ideas never leave the device unless the sender ticks "Include notes & gift ideas".
- `npm install` needs `legacy-peer-deps` (set in `.npmrc`).
