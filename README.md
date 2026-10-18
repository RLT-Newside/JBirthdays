# JBirthdays

Birthday tracker PWA + Android app. No accounts, no servers — everything stays on your device.

- **Upcoming** — countdown, age they're turning, milestone birthdays highlighted
- **Reminders** — local notifications N days before (default 1 week + on the day), per-person overrides
- **Gift vault** — ideas per person, mark as given → history by year (no repeat gifts)
- **Tags** — Family / Work / Squad…, filter and share by tag
- **Greetings** — templates with `{name}`, `{age}`, `{ordinal}`; one tap opens WhatsApp/SMS via share sheet
- **Share with friends** — one-time copy via link (data compressed into the URL hash, never hits a server) or `.jbday.json` file. Import previews new vs. already-saved and dedupes by name + date.
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
