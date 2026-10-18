# JBirthdays

Birthday tracker PWA + Android app. No accounts, no servers — everything stays on your device.

- **Upcoming** — countdown, age they're turning, milestone birthdays highlighted
- **Reminders** — local notifications N days before (default 1 week + on the day), per-person overrides
- **Gift vault** — ideas per person, mark as given → history by year (no repeat gifts)
- **Tags** — Family / Work / Squad…, filter and share by tag
- **Greetings** — templates with `{name}`, `{age}`, `{ordinal}`; one tap opens WhatsApp/SMS via share sheet
- **Share with friends** — one-time copy via link (data compressed into the URL hash, never hits a server) or `.jbday.json` file. Import previews new vs. already-saved and dedupes by name + date.
- **Import from other apps** — calendar (`.ics`), contacts (`.vcf`) and spreadsheet (`.csv`) exports, via Share → Receive or Android "Share to / Open with"; preview shows new, already saved and skipped rows
- **Quick add** — type many birthdays in a row (People → Quick add)
- **Backup** — full export/restore (merge or replace)

## Dev

```sh
npm install        # .npmrc sets legacy-peer-deps
npm run dev
npm test
npm run check      # biome
npm run build
```

## Android

```sh
npm run android       # build + cap sync (android/ already scaffolded)
npm run android:open
```

Share links point at `SHARE_BASE_URL` in `src/utils/share.ts` — update it to wherever the web build is deployed.

## Releases (APK for your phone)

`.github/workflows/release.yml` runs on every push to `main` (or manually): checks → signed release APK → GitHub Release `v1.0.<run>`.

One-time setup (needs `gh`, `keytool`, `openssl`):

```sh
bash scripts/setup-signing.sh RLT-Newside/JBirthdays
```

This creates `~/.jbirthdays-release.keystore` and stores it plus its password as repo secrets. Back up the keystore — a new key means phones must uninstall (losing data) before installing updates.

On the phone: open the latest Release → download the `.apk` → allow "install unknown apps" for your browser once. After that the app checks GitHub once a day and offers in-app updates (download → SHA-256 check → Android installer); Settings has a manual "Check for updates".
