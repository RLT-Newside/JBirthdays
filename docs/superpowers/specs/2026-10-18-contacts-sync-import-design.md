# Contacts sync, file import and quick add — design

Date: 2026-10-18 · App: JBirthdays (React 19 + Capacitor 8 Android, local-first, no server)

## Intent and why

Today the user remembers birthdays in their head and sees them in Snapchat. When Snapchat shows a friend's birthday, they **go to WhatsApp and write them**. Getting birthdays *into* JBirthdays is the friction, and the moment that matters is *sending the WhatsApp message*.

Most of the user's friends are already phone contacts (that's how WhatsApp works), usually **without** a birthday stored. Linking a JBirthdays person to a contact therefore gives two things: birthdays stay consistent between the phone and the app, and the app knows the friend's phone number, so "send wishes" can open **that friend's WhatsApp chat with the greeting pre-filled**.

## Goals

1. **Selective two-way contact sync (Android).** The user chooses which contacts to link. The user has ~300 contacts and does **not** want them all; nothing is linked or imported automatically. For linked people, the **birthday** stays in step both ways. Names are independent (nicknames like "Mom" are fine).
2. **Contact details shown in the app.** For linked people, show phone numbers, emails and postal addresses on the person screen (tap to call / SMS / email / open in maps). Read-only in JBirthdays.
3. **"Send on WhatsApp"** on the person screen: opens the linked contact's WhatsApp chat with the rendered greeting pre-filled.
4. **File import** of birthday exports from other apps: `.ics` (calendar), `.vcf` (vCard contacts), `.csv` (spreadsheet). Via file picker on the Share tab and via Android's share sheet / "open with".
5. **Quick add**: a fast multi-row entry screen for people who aren't contacts (e.g. Snapchat-only friends).

## Non-goals

- Importing from Snapchat, Facebook or WhatsApp directly — none of them expose friends' birthdays to other apps or in their data exports. Quick add is the answer for these.
- Live/background sync. Sync runs on app open/resume and on "Sync now".
- Editing phone/email/address from JBirthdays (edit them in Contacts).
- Creating new phone contacts from JBirthdays people, or deleting phone contacts. Ever.
- iOS. Contact features are Android-only; the web/PWA build hides them (file import and quick add work on web).
- Syncing tags, notes, gifts, reminders or templates to contacts.

## Anti-goals (would be a failure even if it "works")

- **Damaging the user's contacts**: overwriting a name or birthday the user didn't change in JBirthdays, wiping other contact fields, deleting a contact, or creating duplicates in the address book.
- **Flooding the app** with hundreds of contacts.
- **Contact data leaving the device**: contact details must never appear in share links/files or backups.
- Silent failure: a sync that couldn't write must say so.

## Decisions (agreed with the user)

- User picks contacts to sync; two-way updates for synced people (user's words: "when you update the people that it updates in both apps").
- **Only the birthday syncs both ways. Names stay separate**: each side keeps its own name; a person created from a contact starts with the contact's name. JBirthdays never writes names to contacts. Phone/email/address are shown only.
- Sync on app open/resume plus a "Sync now" button.
- If both sides changed since last sync, the most recent change wins.
- Deleting a person in JBirthdays only unlinks; it never touches the contact.
- Contacts without a birthday are listed in the picker; ticking one asks for the date, which is then written into the contact (and so reaches Google Contacts / Google Calendar birthdays if it's a Google contact).
- WhatsApp is the primary send path when a phone number is known; otherwise the existing share sheet.
- File import formats: `.ics`, `.vcf`, `.csv`. Plus Quick add.

## How it works

### Native plugin `ContactSync` (Java, our own)

`@capacitor-community/contacts@8` can read birthdays but has **no update** method, so writes need our own plugin. Follow the existing pattern (`ImportBridgePlugin`, `AppUpdatePlugin`): Java class in `android/app/src/main/java/com/rltnewside/jbirthdays/`, registered in `MainActivity`, accessed from TS via `window.Capacitor.Plugins` and a typed wrapper.

- Permissions: `READ_CONTACTS` requested when the user first opens the contact picker; `WRITE_CONTACTS` requested the first time a write is needed (a birthday typed in the picker, or an app-side change to a linked person). Use Capacitor's `@Permission` aliases (`contactsRead`, `contactsWrite`).
- Methods (shape is the builder's call; this is the minimum):
  - `list()` → all contacts as `{ lookupKey, contactId, name, birthday? }` (lightweight, for the picker; ~300 rows).
  - `get(lookupKeys[])` → full data for linked contacts: name, birthday, phones (number, normalized E.164 if Android has it, type), emails, postal addresses, last-updated timestamp (`CONTACT_LAST_UPDATED_TIMESTAMP`). Missing contacts are reported as missing.
  - `setBirthday(lookupKey, {month, day, year?})`. No name writes.
  - `list()`/`get()` also report whether the contact has a writable raw contact.
- **Identity**: store the contact `lookupKey` (stable across re-aggregation) plus last known `contactId`; resolve with `ContactsContract.Contacts.lookupContact`.
- **Birthday storage**: `ContactsContract.CommonDataKinds.Event`, `TYPE_BIRTHDAY`, `START_DATE` as `YYYY-MM-DD`, or `--MM-DD` when the year is unknown. Read both forms; ignore unparseable values rather than overwriting them.
- **Which raw contact to write to** (a contact can aggregate Google, WhatsApp, SIM, … raw contacts): update the raw contact that already holds the birthday; otherwise prefer a Google account raw contact, then a local/device one; never write into read-only sync accounts (e.g. WhatsApp). Update in place; insert an Event row only if none exists. Never touch other rows.
- **Read-only contacts** (only read-only raw contacts, e.g. WhatsApp/SIM/Exchange): linking is allowed, but sync is one-way contact → app, and the person screen shows a "read-only contact" badge. *(builder's call, approved in review)*

### Data model (TypeScript)

- `Person` gains optional `contact?: { lookupKey: string; contactId?: string; synced: { month: number; day: number; year?: number }; syncedAt: number }`. `synced` is the last agreed birthday, the base for the three-way merge.
- `Person` gains optional `birthdayChangedAt?: number`, set only when month/day/year change (not on notes/tags/etc. edits or import tag merges). It's used for conflict resolution. *(builder's call)*
- The remembered WhatsApp number choice lives in the device-only cache, not on the person, so phone numbers never enter backups; after a restore the user picks again. *(builder's call)*
- Contact details (phones/emails/addresses) live in a separate **device-only cache** key (e.g. `bday_contact_cache`, keyed by lookupKey), added to `DEVICE_ONLY_KEYS` so backups skip it. It's rebuilt on every sync.
- `buildPacket` must never include `contact` or cached details. On import, received people are never linked. On backup restore, `contact` links may be kept, and the next sync re-validates them.

### Sync algorithm (pure, unit-tested in `src/utils/`)

For each linked person, compare the app birthday (A), contact birthday (C) and `synced` base (B), treating month+day+year as one value:

- A = B, C = B → nothing.
- A ≠ B, C = B → write A to contact.
- A = B, C ≠ B → update person from C.
- A ≠ B, C ≠ B, A ≠ C → most recent wins: person `birthdayChangedAt` vs contact last-updated timestamp. The contact timestamp is coarse (any contact edit bumps it), but this case only arises when both birthdays really changed, so the contact side may be favoured slightly. That's acceptable. *(builder's call)*
- A ≠ B, C ≠ B, A = C → nothing to write.
- Then set `synced` to the agreed values.
- Contact birthday removed (C has no birthday) → treat as "contact changed" only if the contact's timestamp is newer than `syncedAt`; never delete the person's birthday, keep it and write it back (a person without a birthday can't exist in the app).
- Contact gone → unlink (drop `contact`), keep the person, and show a notice listing who was unlinked.
- Year is part of the value: adding or removing a year is a normal change and follows the rules above. It's not refilled from the other side. *(builder's call)*
- Write failures (no permission, read-only account) → keep the link, leave `synced` unchanged so it retries, and surface "Couldn't update N contacts" with the reason.

When sync runs: on app start and on resume (existing `appStateChange`), throttled to once per few minutes, plus "Sync now" in Settings. Sync never runs on web. Reminders reschedule through the existing data-change effect.

### Contact picker (Android)

- Entry points: People tab (a "From contacts" action next to the add FAB / empty state), Settings ("Contacts" card: linked count, Sync now, Manage), and a "Link to contact" action on an existing person's detail screen.
- Full-screen modal list of all contacts, searchable, birthday shown when present. Filter chips: **Has birthday** (default on) / All.
- Rows already linked show as ticked. Rows that match an existing unlinked person by normalized name **or** by identical birthday + similar name are marked "In JBirthdays", and ticking them **links** to that person instead of creating a duplicate. Names are never changed by linking. If the birthdays differ, ask which to keep. "Link to contact" from a person screen lets the user link any contact (e.g. "Mom" → "Maria Rossi").
- Ticking a contact without a birthday expands an inline day/month/(year) picker using the existing `Select` component. It's required to confirm.
- Confirm creates/links people, writes typed birthdays into the contacts, then runs a sync.
- Unticking a linked row unlinks; it never deletes the person.

### WhatsApp send

- On the person screen's "Send wishes" section: when the linked contact has a phone, show **Send on WhatsApp** as the primary button, keeping the existing generic share as secondary.
- Number choice: first mobile number with a normalized E.164 value; if several mobiles, let the user choose once and remember the choice on the person.
- Open `https://wa.me/<digits>?text=<urlencoded message>` so Android hands it to WhatsApp (falls back to the browser if WhatsApp isn't installed). No number → today's share-sheet behaviour.

### File import (`.ics`, `.vcf`, `.csv`)

- Pure parsers in `src/utils/` → a list of `{ name, month, day, year? }` → reuse the existing preview/merge path (`ImportDialog` + `planImport`/`applyImport`, which dedupe by name+date).
- `.ics`: `VEVENT`s with all-day `DTSTART`. Accept yearly-recurring events and events whose summary looks like a birthday. Strip common wrappers ("X's birthday", "Birthday: X", "Geburtstag von X", "🎂 X") to get the name. Year from `DTSTART` only when it isn't an obvious placeholder (e.g. 1604, 1900).
- `.vcf`: `FN` (fallback `N`), `BDAY` in `YYYY-MM-DD`, `YYYYMMDD`, `--MM-DD`, `--MMDD`. Multiple cards per file; skip cards without `BDAY`. Contacts imported this way are **not** linked (they're plain people).
- `.csv`: detect header; accept `name` plus either a `birthday`/`date` column (ISO, `DD.MM.YYYY`, `DD/MM/YYYY`, `MM/DD/YYYY` when unambiguous) or `day`/`month`/`year` columns. `,` or `;` separators. Ambiguous rows (e.g. `03/04`) are listed as skipped in the preview, not guessed.
- Entry points: Share tab → Receive → "Import from file" accepts these types in addition to `.jbday.json`. Android intent filters for `text/calendar`, `text/x-vcard`, `text/vcard`, `text/csv`, `text/comma-separated-values` (SEND and VIEW), routed through the existing `ImportBridge` + `parseImportText` classification.
- The preview shows "N new, M already saved, K skipped (why)".

### Quick add

- Modal/screen from the People tab ("Quick add"): stacked rows of name + day + month (+ optional year), using the existing field/`Select` styles. Enter on a filled row adds a new row and focuses its name. Already-saved names+dates are flagged inline. Save adds all valid rows at once. Optional: apply a tag to all.

## Privacy

- Contact data is read only after an explicit permission prompt that the user triggers. Only linked contacts' details are cached, on-device, excluded from backups and share packets.
- Settings privacy text is updated to mention contacts.
- Unlink-all option in Settings removes all links and the cache.

## Left to the builder

- Exact plugin method signatures, threading, and batching of contact writes.
- UI layout details within the existing design language (glass cards, `.field`, `Select`, Bebas headings).
- Throttle interval for resume sync.
- How placeholder years in `.ics` are detected beyond the examples.
- Test strategy for the native plugin. No device is connected to this machine, so native behaviour must be verified on the user's phone via a release, and JS logic must be fully unit-tested.

## Suggested build order

1. Pure logic + tests: date/name parsers, `.ics`/`.vcf`/`.csv` parsers, three-way merge, WhatsApp link builder.
2. File import + intent filters (works on web too) and Quick add.
3. `ContactSync` plugin (read), picker, linking, details on the person screen, WhatsApp button.
4. Birthday write-back + sync on resume + Settings card.
