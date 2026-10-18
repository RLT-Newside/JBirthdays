# Contacts Sync, File Import & Quick Add Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get birthdays into JBirthdays easily (import of `.ics`/`.vcf`/`.csv` files, Quick add, selective contact linking with two-way birthday sync) and send wishes straight into the friend's WhatsApp chat.

**Architecture:** Pure, unit-tested parsers and sync logic live in `src/utils/`. File imports become a regular `SharePacket` and reuse the existing `ImportDialog` → `planImport`/`applyImport` path. Contacts go through a new Java Capacitor plugin `ContactSync` (same pattern as `ImportBridgePlugin`/`AppUpdatePlugin`) behind a typed TS wrapper that returns `null` on web. A `useContactSync` hook runs the three-way birthday merge on start/resume.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind 4, Capacitor 8 (Android, Java), Vitest + Testing Library (jsdom), Biome.

**Spec:** `docs/superpowers/specs/2026-10-18-contacts-sync-import-design.md`

## Global Constraints

- Two releases. **Release 1** (Tasks 1–6) on branch `feat/file-import-quick-add`; **Release 2** (Tasks 7–13) on branch `feat/contact-sync`, branched from `main` after Release 1 is merged. Merge = fast-forward push to `main`, which triggers the APK release workflow.
- Before every push: `npx biome check src/` (0 errors), `node node_modules/typescript/lib/tsc.js -b` (clean), `npx vitest run` (all green).
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Repo git email is the GitHub noreply address (already configured).
- New source files start with `// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.`
- **Only the birthday syncs both ways. Names stay separate.** JBirthdays never writes names to contacts, never creates or deletes contacts.
- Contact details (phones, emails, addresses, chosen WhatsApp number) live only in the device-only key `bday_contact_cache` and never appear in backups or share packets.
- Contact features are Android-only; on web they're hidden (`getContactSync()` returns `null`). File import and Quick add work everywhere.
- All UI uses the existing design language: `.field`, `Select` (`src/components/select/select.tsx`), `.switch`/`.check`, `GlassCard`, `Modal`, `Button`, `font-heading`.
- Birthday validity everywhere: month 1–12, day 1–`daysInMonth(month)` (from `src/utils/birthday.ts`; Feb has 29), year 1900–2100 when present.

## Review Focus

1. **Calendar exports full of non-birthday events** (a whole Google/Outlook calendar): only birthday events are imported, others are ignored silently (not listed as skipped). Test pinned in Task 2.
2. **Files from Excel/Outlook with UTF-8 BOM, CRLF line endings and `;` separators**: parse the same as clean files. Test pinned in Task 3.
3. **Feb 29 without a year** (`--02-29`, `--0229`) in vCards/contacts: accepted as a valid birthday. Test pinned in Task 1.
4. **A contact write fails** (permission revoked, read-only account, app killed mid-sync): the link stays, `synced` is unchanged so the next sync retries, and the user sees how many failed. Tests pinned in Tasks 7 and 10.
5. **Same person spelled differently** in contacts vs JBirthdays ("Lena Müller" vs "lena muller"): the picker offers to link, not duplicate. Test pinned in Task 11.

---

## Release 1 — File import & Quick add

### Task 1: Date tokens + vCard parser

**Files:**
- Modify: `src/types/index.ts` (add `export interface Birthday { month: number; day: number; year?: number }`)
- Create: `src/utils/external/types.ts`, `src/utils/external/dates.ts`, `src/utils/external/text.ts`, `src/utils/external/vcf.ts`
- Test: `src/utils/external/dates.test.ts`, `src/utils/external/vcf.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  ```ts
  // Birthday is imported from '../../types'
  export interface ExternalEntry extends Birthday { name: string }
  export interface SkippedEntry { label: string; reason: string }
  export interface ExternalResult { entries: ExternalEntry[]; skipped: SkippedEntry[] }
  ```
- Produces (`dates.ts`):
  - `parseDateToken(raw: string, slashOrder?: 'dmy' | 'mdy'): Birthday | 'ambiguous' | null`. Accepts `YYYY-MM-DD`, `YYYYMMDD`, `--MM-DD`, `--MMDD`, `DD.MM.YYYY`, `D.M.YYYY`, `DD.MM.` and slash dates `A/B/YYYY`. For slashes: use `slashOrder` if given; otherwise, if A > 12 it's dmy, if B > 12 it's mdy, else `'ambiguous'`. Strips a trailing time part (`T…`). Invalid calendar dates → `null`.
  - `isPlaceholderYear(y: number): boolean`: true for `y < 1900` and for `1900`/`1604`/`0`. The caller drops the year.
- Produces (`text.ts`): `unfoldLines(text: string): string[]` strips the BOM, splits on `\r?\n` and joins RFC 5545/6350 continuation lines (a line starting with a space or tab). `unescapeValue(v: string): string` handles `\,` `\;` `\n` `\\`.
- Produces (`vcf.ts`): `parseVcf(text: string): ExternalResult`. Per `BEGIN:VCARD…END:VCARD`: name from `FN`, else `N` (`Family;Given;…` → "Given Family"). Birthday from `BDAY` (params like `BDAY;VALUE=date:` ignored). Cards without `BDAY` are ignored (not skipped). Unparseable `BDAY` → skipped `{label: name, reason: 'Unreadable date'}`.

- [ ] **Step 1: Write failing tests**

`dates.test.ts`:
```ts
it.each([
  ['1990-03-15', { month: 3, day: 15, year: 1990 }],
  ['19900315', { month: 3, day: 15, year: 1990 }],
  ['--03-15', { month: 3, day: 15 }],
  ['--0229', { month: 2, day: 29 }],
  ['--02-29', { month: 2, day: 29 }],
  ['15.03.1990', { month: 3, day: 15, year: 1990 }],
  ['5.3.1990', { month: 3, day: 5, year: 1990 }],
  ['15/03/1990', { month: 3, day: 15, year: 1990 }],
  ['03/15/1990', { month: 3, day: 15, year: 1990 }],
  ['1990-03-15T00:00:00Z', { month: 3, day: 15, year: 1990 }],
])('parses %s', (raw, out) => expect(parseDateToken(raw)).toEqual(out))
it('flags ambiguous slash dates unless an order is given', () => {
  expect(parseDateToken('03/04/1990')).toBe('ambiguous')
  expect(parseDateToken('03/04/1990', 'dmy')).toEqual({ month: 4, day: 3, year: 1990 })
})
it.each(['1990-02-30', '--13-01', 'hello', ''])('rejects %s', (raw) => expect(parseDateToken(raw)).toBeNull())
it('detects placeholder years', () => {
  expect(isPlaceholderYear(1604)).toBe(true)
  expect(isPlaceholderYear(1900)).toBe(true)
  expect(isPlaceholderYear(1987)).toBe(false)
})
```
`vcf.test.ts`: a fixture with 4 cards, joined with `\r\n` and a leading BOM:
- `FN:Lena Müller` + `BDAY:1998-10-24`
- `N:Rossi;Maria;;;` (no FN) + `BDAY;VALUE=date:--0229`
- `FN:No Birthday` without a BDAY
- `FN:Bad` + `BDAY:soon`

and one folded line (`FN:Very Long\r\n  Name`). Assert:
- `entries` = `[{name:'Lena Müller',month:10,day:24,year:1998},{name:'Maria Rossi',month:2,day:29},…]`
- the folded name is `'Very Long Name'`
- `skipped` = `[{label:'Bad',reason:'Unreadable date'}]`

- [ ] **Step 2: Run to verify they fail** — `npx vitest run src/utils/external` → FAIL (modules not found).
- [ ] **Step 3: Implement `types.ts`, `dates.ts`, `text.ts`, `vcf.ts`** per the interfaces. Validate with `daysInMonth` from `src/utils/birthday.ts`, and drop placeholder years.
- [ ] **Step 4: Run to verify they pass** — `npx vitest run src/utils/external` → PASS.
- [ ] **Step 5: Commit** — `feat: vCard and date-token parsing for file import`

### Task 2: Calendar (`.ics`) parser

**Files:**
- Create: `src/utils/external/ics.ts`
- Test: `src/utils/external/ics.test.ts`

**Interfaces:**
- Consumes: `unfoldLines`, `unescapeValue`, `parseDateToken`, `isPlaceholderYear`, the `ExternalResult` types (Task 1).
- Produces: `parseIcs(text: string): ExternalResult` and `birthdayNameFromSummary(summary: string): string | null`.

`VEVENT`s with a date `DTSTART` (`DTSTART;VALUE=DATE:19900315` or a date-time) are birthday events when `RRULE` contains `FREQ=YEARLY` **or** the summary matches a birthday pattern. Other events are ignored silently. The name comes from `birthdayNameFromSummary`, falling back to the raw summary when only `RRULE` qualified it. Birthday events whose date can't be parsed are skipped with `reason: 'Unreadable date'`. The year is kept only if it isn't a placeholder.

`birthdayNameFromSummary` strips leading/trailing 🎂🎉🎈🥳 and whitespace, then matches, case-insensitively and returning the trimmed name:
- `X's birthday` / `X’s birthday` / `X birthday`
- `Birthday: X` / `Birthday X`
- `Happy birthday, X!` / `Happy birthday X`
- `Geburtstag von X` / `Geburtstag: X` / `Xs Geburtstag` / `X's Geburtstag` / `X Geburtstag`

It returns `null` when nothing matches.

- [ ] **Step 1: Write failing tests**
```ts
it.each([
  ["Lena's birthday", 'Lena'], ['Lena’s Birthday', 'Lena'], ['🎂 Birthday: Max Muster', 'Max Muster'],
  ['Happy birthday, Anna!', 'Anna'], ['Geburtstag von Jonas', 'Jonas'], ['Jonas Geburtstag', 'Jonas'],
])('extracts %s', (s, name) => expect(birthdayNameFromSummary(s)).toBe(name))
it('returns null for normal events', () => expect(birthdayNameFromSummary('Team meeting')).toBeNull())

it('imports only birthday events from a full calendar', () => {
  // fixture: 500 "Meeting n" VEVENTs (DTSTART;TZID=Europe/Zurich:20261018T090000, no RRULE)
  // + "Lena's birthday" DTSTART;VALUE=DATE:19981024 RRULE:FREQ=YEARLY
  // + "Sam" DTSTART;VALUE=DATE:16040229 RRULE:FREQ=YEARLY  (placeholder year)
  const r = parseIcs(fixture)
  expect(r.entries).toEqual([
    { name: 'Lena', month: 10, day: 24, year: 1998 },
    { name: 'Sam', month: 2, day: 29 },
  ])
  expect(r.skipped).toEqual([])
})
it('skips a birthday event with a broken date', () => {
  expect(parseIcs(cal("Bob's birthday", 'DTSTART:garbage')).skipped).toEqual([{ label: 'Bob', reason: 'Unreadable date' }])
})
```
- [ ] **Step 2: Run to verify they fail** — `npx vitest run src/utils/external/ics.test.ts` → FAIL.
- [ ] **Step 3: Implement `ics.ts`.**
- [ ] **Step 4: Run to verify they pass** → PASS.
- [ ] **Step 5: Commit** — `feat: calendar (.ics) birthday import parsing`

### Task 3: Spreadsheet (`.csv`) parser

**Files:**
- Create: `src/utils/external/csv.ts`
- Test: `src/utils/external/csv.test.ts`

**Interfaces:**
- Consumes: `parseDateToken` and the types (Task 1).
- Produces: `parseCsv(text: string): ExternalResult`.

Behaviour:
- **Normalisation:** strip the BOM. The separator is whichever of `,` and `;` appears more often in the first line. Quoted fields support `""` escapes.
- **Header** (case-insensitive, trimmed):
  - name: `name|full name|fullname|display name`, or `first name`+`last name` (also `given name`/`family name`, `vorname`/`nachname`) joined with a space
  - date: `birthday|birthdate|birth date|date of birth|dob|date|geburtstag|geburtsdatum`
  - or separate `day|tag`, `month|monat`, `year|jahr` columns
- **No recognisable header:** treat it as headerless `name,date` when column 2 of row 1 parses as a date.
- **Slash order:** decided once per file. Scan all date cells: any with first part > 12 → `dmy`; any with second part > 12 → `mdy`. If both are found, or neither, slash dates are ambiguous.
- **Skipped rows:**
  - rows without a name are ignored
  - ambiguous dates → `{label: name, reason: 'Ambiguous date (day/month?)'}`
  - unparseable dates → `{label: name, reason: 'Unreadable date'}`

- [ ] **Step 1: Write failing tests**
```ts
it('handles BOM, CRLF and semicolons (Excel export)', () => {
  const text = '﻿Name;Geburtstag\r\nLena Müller;24.10.1998\r\n"Rossi; Maria";--02-29\r\n'
  expect(parseCsv(text).entries).toEqual([
    { name: 'Lena Müller', month: 10, day: 24, year: 1998 },
    { name: 'Rossi; Maria', month: 2, day: 29 },
  ])
})
it('joins first/last name and reads day/month/year columns', () => {
  expect(parseCsv('First Name,Last Name,Day,Month,Year\nAnna,Meier,3,7,\n').entries).toEqual([{ name: 'Anna Meier', month: 7, day: 3 }])
})
it('infers slash order from the file and skips ambiguous rows otherwise', () => {
  expect(parseCsv('name,birthday\nA,25/12/1990\nB,03/04/1991\n').entries[1]).toEqual({ name: 'B', month: 4, day: 3, year: 1991 })
  expect(parseCsv('name,birthday\nB,03/04/1991\n').skipped).toEqual([{ label: 'B', reason: 'Ambiguous date (day/month?)' }])
})
it('accepts headerless name,date', () => {
  expect(parseCsv('Max,1990-01-02\n').entries).toEqual([{ name: 'Max', month: 1, day: 2, year: 1990 }])
})
```
- [ ] **Step 2: Run to verify they fail** → FAIL.
- [ ] **Step 3: Implement `csv.ts`.**
- [ ] **Step 4: Run to verify they pass** → PASS.
- [ ] **Step 5: Commit** — `feat: spreadsheet (.csv) birthday import parsing`

### Task 4: Wire file import into the import flow

**Files:**
- Create: `src/utils/external/index.ts`
- Modify:
  - `src/utils/importSource.ts`
  - `src/context/app-data.tsx` (the `pendingImport` type)
  - `src/app-shell.tsx`
  - `src/hooks/useLinkImport.ts` call site (wrap the packet)
  - `src/pages/share/share.container.tsx`
  - `src/pages/share/share.view.tsx` (file `accept`, receive copy)
  - `src/pages/settings/settings.container.tsx`
  - `src/components/import-dialog/import-dialog.tsx`
  - `android/app/src/main/AndroidManifest.xml`
- Test: `src/utils/external/index.test.ts`, `src/utils/importSource.test.ts` (extend), `src/App.test.tsx` (extend)

**Interfaces:**
- Consumes: `parseVcf`, `parseIcs`, `parseCsv` (Tasks 1–3).
- Produces (`external/index.ts`):
  - `type ExternalFormat = 'calendar' | 'contacts' | 'spreadsheet'`
  - `detectExternal(text: string): ExternalFormat | null`: `BEGIN:VCALENDAR` → calendar, `BEGIN:VCARD` → contacts, else spreadsheet when the first line contains `,` or `;`. Ignore the BOM and leading whitespace.
  - `toPacket(entries: ExternalEntry[]): SharePacket` with `{app:'jbirthdays', version:1, people: entries.map((e,i) => ({ id: \`ext-${i}\`, name: e.name, month, day, year, tags: [] }))}`, deduped by `personKey`.
- Produces (`importSource.ts`):
  ```ts
  export interface PendingImport { packet: SharePacket; origin?: ExternalFormat; skipped?: SkippedEntry[] }
  export type ImportSource = ({ kind: 'packet' } & PendingImport) | { kind: 'backup'; backup: Backup }
  ```
  `parseImportText` tries the existing JSON/link handling first, then `detectExternal` → parser → `{kind:'packet', packet: toPacket(entries), origin, skipped}`. It returns `null` when there are 0 entries and 0 skipped.
- Context: `pendingImport: PendingImport | null`, `setPendingImport(p: PendingImport | null)`. `ImportDialog` props become `{ pending: PendingImport | null; onClose; onImported }`.

ImportDialog copy:
- for `origin`: `Found {n} birthdays in this {calendar file|contacts file|spreadsheet}.` (singular "birthday" for 1)
- when `skipped.length > 0`: a collapsed `<details>` "{k} skipped" listing `label — reason`

Manifest: add SEND and VIEW intent filters, mirroring the existing JSON ones, for `text/calendar`, `text/x-vcalendar`, `text/vcard`, `text/x-vcard`, `text/csv`, `text/comma-separated-values`. `ImportBridgePlugin` already reads any stream as text, so there are no Java changes.

The Share tab's file input `accept` becomes `.json,.jbday.json,.ics,.vcf,.csv,application/json,text/calendar,text/vcard,text/x-vcard,text/csv`. Receive helper text mentions "or a calendar/contacts/spreadsheet export from another app".

- [ ] **Step 1: Write failing tests**
  - `index.test.ts`: `detectExternal` for each format plus `'{"app":…}'` → `null`. `toPacket` dedupes two identical entries and has no `from`.
  - `importSource.test.ts`: `parseImportText(vcardText)` → `kind:'packet'`, `origin:'contacts'`, `packet.people[0].name === 'Lena'`. `parseImportText('just words')` → `null`.
  - `App.test.tsx`: open the Share tab, upload a `File(['BEGIN:VCALENDAR…Lena\'s birthday…END:VCALENDAR'], 'b.ics', {type:'text/calendar'})` into the Receive file input, and expect the text `Found 1 birthday in this calendar file.` Click Import, then expect `Lena` on Upcoming.
- [ ] **Step 2: Run to verify they fail** — `npx vitest run src/utils src/App.test.tsx` → FAIL.
- [ ] **Step 3: Implement** `external/index.ts`, the `importSource.ts` changes, the `PendingImport` type through context and callers, the ImportDialog copy and skipped list, the `accept` change and the manifest filters.
- [ ] **Step 4: Run all checks** — biome, tsc, `npx vitest run` → all PASS.
- [ ] **Step 5: Commit** — `feat: import birthdays from calendar, contacts and spreadsheet files`

### Task 5: Quick add

**Files:**
- Create: `src/components/quick-add-modal/quick-add-modal.tsx`, `src/utils/quickAdd.ts`
- Modify:
  - `src/context/app-data.tsx` (add `quickAddOpen: boolean`, `setQuickAddOpen(open: boolean)`)
  - `src/app-shell.tsx` (render `<QuickAddModal />`)
  - `src/pages/people/people.view.tsx` + `people.container.tsx` (a "Quick add" button next to the sort toggle; prop `onQuickAdd: () => void`)
  - `src/pages/upcoming/upcoming.view.tsx` (empty state gets a secondary "Add several at once" button calling `setQuickAddOpen(true)`)
- Test: `src/utils/quickAdd.test.ts`, `src/components/quick-add-modal/quick-add-modal.test.tsx`

**Interfaces:**
- Produces (`quickAdd.ts`):
  - `interface QuickRow { key: string; name: string; day: number; month: number; year: string }`
  - `rowStatus(row: QuickRow, people: Person[]): 'empty' | 'invalid' | 'duplicate' | 'ok'`: empty when the name is blank. Invalid when the year is non-empty and outside 1900–2100, or the day exceeds `daysInMonth`. Duplicate when `personKey` matches an existing person.
  - `rowsToDrafts(rows: QuickRow[], people: Person[], tagIds: string[]): PersonDraft[]` keeps only `'ok'` rows, deduped among themselves, with `tagIds` applied.
- Consumes: `addPerson` from context, `Select`, `personKey`, `daysInMonth`.

UI:
- `Modal` titled "Quick add" with stacked rows: name `.field`, day `Select columns={7}`, month `Select`, year `.field` (inputMode numeric, placeholder "Year?").
- Pressing Enter in a non-empty last row's name or year field appends a row and focuses its name.
- Duplicate rows show "Already saved" in muted brand text. Invalid rows get `aria-invalid`.
- An optional tag chooser (existing tag chips).
- The footer button reads "Add N" (N = ok rows) and is disabled at 0. After saving, flash `Added N birthdays 🎉` via the existing toast and close.

- [ ] **Step 1: Write failing tests**
  - `quickAdd.test.ts`: `rowStatus` for empty, invalid year `'12'`, day 30 in Feb, duplicate of an existing Lena 24.10, and ok. `rowsToDrafts` drops non-ok rows and dedupes two identical ok rows.
  - Component test: render the modal open, type "Anna" and press Enter, check a second row's name field has focus, type "Ben", and the button shows "Add 2". Click it and expect two `addPerson` calls (via a rendered App, or a context wrapper reading `people`).
- [ ] **Step 2: Run to verify they fail** → FAIL.
- [ ] **Step 3: Implement** `quickAdd.ts`, the modal, the context flag and the entry points.
- [ ] **Step 4: Run all checks** → PASS.
- [ ] **Step 5: Commit** — `feat: quick add for entering many birthdays at once`

### Task 6: Release 1

- [ ] **Step 1:** Update `README.md` features: file import (`.ics`/`.vcf`/`.csv`) and Quick add.
- [ ] **Step 2:** Manual browser check (`npx vite --port <free>`): import a sample `.ics`, `.vcf` and `.csv` through Share → Receive. Use Quick add for 3 people. No console errors.
- [ ] **Step 3:** Run all checks, commit, push the branch, and fast-forward `main` (`git push origin feat/file-import-quick-add:main`) only after the user says yes. Watch the `Release APK` run until a new release with an `.apk` + `sha256:` digest exists.

---

## Release 2 — Contact sync & WhatsApp

### Task 7: Types, birthday change time, three-way merge

**Files:**
- Modify:
  - `src/types/index.ts`
  - `src/context/app-data.tsx` (`addPerson`/`updatePerson` set `birthdayChangedAt`)
  - `src/utils/importMerge.ts` (setting a missing year counts as a birthday change)
  - `src/utils/share.ts` (`buildPacket` must not emit `contact`/`birthdayChangedAt`)
- Create: `src/utils/contactSync.ts`
- Test: `src/utils/contactSync.test.ts`, `src/utils/share.test.ts` (extend), `src/utils/importMerge.test.ts` (extend)

**Interfaces:**
- Produces (`types/index.ts`):
  ```ts
  // Birthday already exists here (Task 1)
  export interface ContactLink { lookupKey: string; contactId?: string; synced: Birthday; syncedAt: number; readOnly?: boolean }
  // Person gains: contact?: ContactLink; birthdayChangedAt?: number
  ```
- Produces (`contactSync.ts`):
  - `sameBirthday(a?: Birthday, b?: Birthday): boolean`
  - `interface ContactSnapshot { birthday?: Birthday; lastUpdated: number; writable: boolean }`
  - `interface SyncAction { pull?: Birthday; push?: Birthday; nextSynced: Birthday }` (`pull` updates the person, `push` writes the contact)
  - `resolveBirthday(person: Person, contact: ContactSnapshot): SyncAction`

Rules (A = person birthday, B = `person.contact.synced`, C = contact birthday):

| Case | Result |
|---|---|
| C undefined | `push: A` if writable, else nothing; `nextSynced: A` |
| A=B, C=B | nothing |
| A≠B, C=B | `push: A` if writable (read-only → nothing, `nextSynced` stays B) |
| A=B, C≠B | `pull: C` |
| A≠B, C≠B, A=C | nothing |
| A≠B, C≠B, A≠C | `(person.birthdayChangedAt ?? person.updatedAt) >= contact.lastUpdated ? push A : pull C` (read-only always pulls) |

`nextSynced` is the agreed value, except where noted above.

- [ ] **Step 1: Write failing tests**
  - Name each table row as a test case with literal birthdays, plus a read-only variant of rows 1, 3 and 6.
  - A year-removal case: A `{3,15}`, B `{3,15,1990}`, C `{3,15,1990}` → `push {month:3,day:15}`.
  - `share.test.ts`: `buildPacket` with a person carrying `contact` and `birthdayChangedAt` → the packet person has neither key.
  - `importMerge.test.ts`: `applyImport` filling a missing year sets `birthdayChangedAt === now`.
- [ ] **Step 2: Run to verify they fail** → FAIL.
- [ ] **Step 3: Implement.** In `updatePerson`, set `birthdayChangedAt: now` only when month/day/year differ from the stored person; `addPerson` sets it to `now`.
- [ ] **Step 4: Run all checks** → PASS.
- [ ] **Step 5: Commit** — `feat: birthday three-way merge for contact sync`

### Task 8: WhatsApp link + phone choice

**Files:**
- Create: `src/utils/whatsapp.ts`
- Test: `src/utils/whatsapp.test.ts`

**Interfaces:**
- Produces:
  - `interface ContactPhone { number: string; normalized?: string; type: 'mobile' | 'home' | 'work' | 'other' }`
  - `whatsappCandidates(phones: ContactPhone[]): ContactPhone[]`: phones with an E.164 `normalized` (`/^\+\d{8,15}$/`), mobiles first, deduped by `normalized`
  - `whatsappLink(normalized: string, text: string): string` → `https://wa.me/<digits without +>?text=<encodeURIComponent(text)>`

- [ ] **Step 1: Write failing tests**
  - `whatsappLink('+41791234567', 'Happy birthday, Lena! 🎉')` === `'https://wa.me/41791234567?text=Happy%20birthday%2C%20Lena!%20%F0%9F%8E%89'`
  - `whatsappCandidates` puts the mobile before a work number and drops `{number:'079 123', normalized: undefined}` (no country code → no WhatsApp; the UI falls back to share)
- [ ] **Step 2–4:** fail → implement → pass.
- [ ] **Step 5: Commit** — `feat: WhatsApp deep link helpers`

### Task 9: Native `ContactSync` plugin + TS wrapper

**Files:**
- Create: `android/app/src/main/java/com/rltnewside/jbirthdays/ContactSyncPlugin.java`, `src/utils/contacts.ts`
- Modify: `MainActivity.java` (`registerPlugin(ContactSyncPlugin.class)`), `AndroidManifest.xml` (`READ_CONTACTS`, `WRITE_CONTACTS`)
- Test: `src/utils/contacts.test.ts`

**Interfaces:**
- Produces (`contacts.ts`):
  ```ts
  export interface ContactSummary { lookupKey: string; contactId: string; name: string; birthday?: Birthday; writable: boolean }
  export interface ContactDetails extends ContactSummary { phones: ContactPhone[]; emails: string[]; addresses: string[]; lastUpdated: number }
  export interface ContactSyncApi {
    requestRead(): Promise<boolean>
    requestWrite(): Promise<boolean>
    list(): Promise<ContactSummary[]>
    get(lookupKeys: string[]): Promise<{ found: ContactDetails[]; missing: string[] }>
    setBirthday(lookupKey: string, birthday: Birthday): Promise<void>
  }
  export function getContactSync(): ContactSyncApi | null  // null unless Capacitor.isNativePlatform() and window.Capacitor.Plugins.ContactSync exists
  export function parseContactDate(startDate: string): Birthday | null  // 'YYYY-MM-DD' | '--MM-DD'
  export function formatContactDate(b: Birthday): string               // inverse
  ```
- Java (`@CapacitorPlugin(name = "ContactSync", permissions = { @Permission(alias = "contactsRead", strings = { READ_CONTACTS }), @Permission(alias = "contactsWrite", strings = { WRITE_CONTACTS }) })`):
  - **Permissions:** `requestRead`/`requestWrite` resolve `{granted: boolean}` via `requestPermissionForAlias` + `@PermissionCallback`.
  - **`list`:** returns `{contacts: […]}`. Query `Contacts` (`LOOKUP_KEY`, `_ID`, `DISPLAY_NAME_PRIMARY`), and `Data` rows of `Event.CONTENT_ITEM_TYPE` with `TYPE_BIRTHDAY` (raw `START_DATE` string). Mark `writable` when any raw contact's account type is not in `{com.whatsapp, com.android.sim, vnd.sec.contact.sim}` and its sync adapter allows writes; `"com.google"` and local accounts count as writable. Sorted by name.
  - **`get`:** takes `{lookupKeys}` and resolves each via `Contacts.lookupContact`. Adds phones (`NUMBER`, `NORMALIZED_NUMBER`, `TYPE` mapped to mobile/home/work/other), emails, `StructuredPostal.FORMATTED_ADDRESS` and `CONTACT_LAST_UPDATED_TIMESTAMP`. Unresolvable keys go into `missing`.
  - **`setBirthday`:** takes `{lookupKey, startDate}`. Choose the raw contact: (1) the one already holding a birthday Event, else (2) a `com.google` raw contact, else (3) the first writable one. Update the existing Event row's `START_DATE`, or insert an Event row (`TYPE_BIRTHDAY`). Use `ContentProviderOperation`s and touch no other rows. Reject `"NOT_WRITABLE"` when no writable raw contact exists, and `"NO_PERMISSION"` without the write permission.
  - Run queries on a background thread (like `AppUpdatePlugin`).
- The TS wrapper converts `START_DATE` strings with `parseContactDate` (invalid → `birthday` undefined) and sends `formatContactDate(b)` on write.

- [ ] **Step 1: Write failing tests** (`contacts.test.ts`)
  - `parseContactDate('1998-10-24')` → `{month:10,day:24,year:1998}`, `'--02-29'` → `{month:2,day:29}`, `'garbage'` → `null`
  - `formatContactDate({month:2,day:9})` === `'--02-09'`
  - `getContactSync()` returns `null` in jsdom
- [ ] **Step 2–4:** fail → implement the TS + Java → pass. Then `npm run build && npx cap sync android && cd android && ./gradlew assembleRelease` compiles.
- [ ] **Step 5: Commit** — `feat: native ContactSync plugin (read contacts, write birthdays)`

### Task 10: Contact cache + `useContactSync`

**Files:**
- Modify: `src/data/storage.ts` (`contactCache: 'bday_contact_cache'`, added to `DEVICE_ONLY_KEYS`)
- Create: `src/context/contacts.tsx` (`ContactsProvider` + `useContacts()`), mounted in `App.tsx` inside `AppDataProvider`
- Test: `src/context/contacts.test.tsx`, `src/utils/backup.test.ts` (extend)

**Interfaces:**
- Consumes: `resolveBirthday` (Task 7), `ContactSyncApi`/`getContactSync` (Task 9), `ContactPhone` (Task 8), `updatePerson`/`people` from app data.
- Produces (`useContacts()`):
  ```ts
  {
    available: boolean                          // getContactSync() !== null
    cache: Record<string, { phones: ContactPhone[]; emails: string[]; addresses: string[]; waNumber?: string }>
    syncing: boolean
    lastResult: { pulled: number; pushed: number; failed: number; unlinked: string[] } | null  // unlinked = person names
    syncNow(): Promise<void>
    link(personId: string, contact: ContactSummary, birthday?: Birthday): Promise<void>     // birthday given → also written to contact
    unlink(personId: string): void
    unlinkAll(): void
    setWaNumber(lookupKey: string, normalized: string): void
  }
  ```
- The provider accepts an optional `api?: ContactSyncApi | null` prop (default `getContactSync()`) so tests inject a fake.

Sync:
- **Triggers:** on mount and on `appStateChange` → active, throttled to 5 minutes (manual `syncNow` ignores the throttle). No-op when `!available` or no linked people.
- **Plan:** `get` the linked keys; missing → unlink and collect names. For each found contact, run `resolveBirthday`.
  - `pull` → `updatePerson` with the new birthday (this also sets `birthdayChangedAt`).
  - `push` → `requestWrite()` once per run, then `setBirthday`.
  - On success, store `nextSynced` + `syncedAt`. A failed push increments `failed` and leaves `synced` untouched.
  - Mirror `writable === false` into `contact.readOnly`.
- **Cache:** rebuilt from `found`.
- **Notices:** when `failed > 0` or `unlinked.length > 0`, the app shell shows a toast like `Couldn't update 2 contacts` / `Unlinked 1 deleted contact: Lena`.

- [ ] **Step 1: Write failing tests** (`contacts.test.tsx`, fake api)
  - Contact changed → person birthday updated and `synced` advanced.
  - Person changed → `setBirthday` called with the person's birthday.
  - `setBirthday` rejects → `lastResult.failed === 1` and `contact.synced` unchanged.
  - Missing contact → person kept, `contact` removed, its name in `lastResult.unlinked`.
  - `backup.test.ts`: `bday_contact_cache` is not exported.
- [ ] **Step 2–4:** fail → implement → pass (all checks).
- [ ] **Step 5: Commit** — `feat: contact sync on start/resume with device-only details cache`

### Task 11: Contact picker + linking

**Files:**
- Create:
  - `src/utils/contactMatch.ts`
  - `src/components/contact-picker/contact-picker.tsx` (full-height `Modal`)
  - `src/components/link-contact-dialog/link-contact-dialog.tsx` (single-select variant for one person, may reuse the picker with `mode="single"`)
- Modify:
  - `src/context/app-data.tsx` (add `contactPickerOpen`/`setContactPickerOpen`, `linkingPersonId`/`setLinkingPersonId`)
  - `src/app-shell.tsx` (render both)
  - `src/pages/people/*` ("From contacts" button when `available`)
  - `src/pages/upcoming/upcoming.view.tsx` (empty state "Import from contacts" when `available`)
- Test: `src/utils/contactMatch.test.ts`, `src/components/contact-picker/contact-picker.test.tsx`

**Interfaces:**
- Produces:
  - `normalizeName(s: string): string`: lowercase, NFD with diacritics stripped, `ß`→`ss`, collapse whitespace, trim
  - `findPersonMatch(contact: ContactSummary, people: Person[]): Person | undefined`: unlinked people only. An equal `normalizeName` wins. Otherwise a person with the same month+day whose first name token equals the contact's first token.
- Consumes: `useContacts().link/unlink`, `list()` and `requestRead()` from `getContactSync()`, `Select`, `.check`, `addPerson`.

Picker behaviour:
- **Opening:** `requestRead()` (denied → message + "Open settings" hint), then `list()`.
- **Toolbar:** search `.field`; chips "Has birthday" (default) / "All".
- **Rows:** `.check`, name, birthday or "No birthday". Badges "Linked" / "In JBirthdays" (when `findPersonMatch`).
- **Ticking a row without a birthday** expands inline day/month `Select`s + an optional year field. It's required before confirming.
- **Confirm "Save N":**
  - new ticks → `addPerson` (name = contact name, birthday from the contact or typed), then `link(newId, contact, typedBirthday?)`
  - a matched person → `link(existingId, contact)`, and if the birthdays differ, first ask with a `ConfirmDialog`: "Keep JBirthdays date (24 Oct) or contact date (25 Oct)?" The chosen value becomes both A and C via `link(..., chosen)`.
  - unticked previously-linked rows → `unlink`
- **Afterwards:** `syncNow()`.

- [ ] **Step 1: Write failing tests**
  - `normalizeName('  Lena  Müller ') === normalizeName('lena muller')`
  - `findPersonMatch` links "Lena Müller" contact to person "lena muller", ignores an already linked person, and matches "Max" contact to "Max Muster" with the same day/month
  - Picker test with a fake api of 3 contacts (one matching an existing person, one without a birthday): "Has birthday" hides the no-birthday one. Switching to All and ticking it shows the date fields. Save → `addPerson` once and `link` twice, and the existing person is not duplicated.
- [ ] **Step 2–4:** fail → implement → pass.
- [ ] **Step 5: Commit** — `feat: pick contacts to link, with duplicate detection`

### Task 12: Person screen, WhatsApp send, Settings card, privacy

**Files:**
- Modify:
  - `src/components/person-detail-modal/person-detail-modal.tsx`
  - `src/pages/settings/settings.view.tsx` (+ new `src/pages/settings/components/contacts-card/contacts-card.tsx`)
  - `src/utils/greeting.ts` (add `openExternal(url: string): void` = `window.open(url, '_system')`)
- Test: `src/components/person-detail-modal/person-detail-modal.test.tsx` (new), `src/App.test.tsx` (extend: web shows no contact UI)

**Interfaces:**
- Consumes: `useContacts()` (Task 10), `whatsappCandidates`/`whatsappLink` (Task 8), `setLinkingPersonId` (Task 11).

Person screen:
- **Linked person:** a "Contact" section listing phones (`tel:` and `sms:` links), emails (`mailto:`) and addresses (`https://maps.google.com/?q=`), plus a "Read-only contact" badge when `contact.readOnly`. Actions "Unlink" and "Link to contact" (when `available` and unlinked).
- **Send wishes:**
  - One WhatsApp candidate (or a stored `waNumber`): the primary button "Send on WhatsApp" calls `openExternal(whatsappLink(n, message))`, and the existing share stays as a secondary "Other apps" button.
  - Several candidates and no `waNumber`: the first tap shows a `Select` of numbers, and choosing one stores it via `setWaNumber`.
  - No candidates: unchanged.

Settings Contacts card (only when `available`): linked count, "Sync now" (spinner while `syncing`, then a result line `Updated N · M failed`), "Choose contacts" (opens the picker), "Unlink all" (with `ConfirmDialog`). Privacy text adds: "Linked contacts' phone numbers and addresses are read on this device only and never included in backups or share links."

- [ ] **Step 1: Write failing tests**
  - Detail modal with a context fake: a linked person with one mobile shows "Send on WhatsApp", and clicking calls `window.open` with a `https://wa.me/41791234567?text=` URL.
  - Two candidates → a number chooser appears first.
  - An unlinked person on web shows no contact UI.
- [ ] **Step 2–4:** fail → implement → pass (all checks).
- [ ] **Step 5: Commit** — `feat: contact details, WhatsApp send and contacts settings`

### Task 13: Release 2

- [ ] **Step 1:** Update the README (contacts + WhatsApp, Android-only) and mark the spec's build order done.
- [ ] **Step 2:** `npm run build && npx cap sync android && cd android && ./gradlew assembleRelease`. It must compile.
- [ ] **Step 3:** Push the branch. Fast-forward `main` only after the user says yes, then watch the release.
- [ ] **Step 4:** Give the user a device test checklist:
  1. Link 2 contacts (one without a birthday, typing a date), and confirm the date appears in the phone's Contacts app.
  2. Change a birthday in Contacts, reopen JBirthdays, and confirm it updated.
  3. Change it in JBirthdays, reopen Contacts, and confirm it updated.
  4. Tap "Send on WhatsApp" and confirm the right chat opens with the text.
  5. Delete a test contact, and confirm the person is unlinked with a notice.
