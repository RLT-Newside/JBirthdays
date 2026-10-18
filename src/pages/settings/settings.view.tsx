// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { Archive, Palette, Shield } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '../../components/button/button'
import { GlassCard } from '../../components/glass-card/glass-card'
import { THEMES, type Theme } from '../../hooks/useTheme'
import { AppVersion } from './components/app-version/app-version'
import { ReminderSettings } from './components/reminder-settings/reminder-settings'
import { TagManager } from './components/tag-manager/tag-manager'
import { TemplateManager } from './components/template-manager/template-manager'

interface Props {
  theme: Theme
  onTheme: (t: Theme) => void
  onExportBackup: () => void
  onImportBackup: (f: File) => void
  backupError?: string
}

export function SettingsView({ theme, onTheme, onExportBackup, onImportBackup, backupError }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-4 pb-4">
      <h2 className="font-heading text-3xl">Settings</h2>

      <ReminderSettings />

      <GlassCard className="space-y-3">
        <h3 className="font-medium flex items-center gap-2">
          <Palette size={16} className="text-brand" /> Accent colour
        </h3>
        <div className="flex gap-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-label={t.id}
              aria-pressed={theme === t.id}
              onClick={() => onTheme(t.id)}
              className={`w-9 h-9 rounded-full press-scale ${theme === t.id ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-[#0d0d0d]' : ''}`}
              style={{ background: t.color }}
            />
          ))}
        </div>
      </GlassCard>

      <TagManager />
      <TemplateManager />

      <GlassCard className="space-y-3">
        <h3 className="font-medium flex items-center gap-2">
          <Archive size={16} className="text-brand" /> Backup
        </h3>
        <p className="text-xs text-white/45">
          Everything lives only on this device. Export a backup before switching phones.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onExportBackup}>
            Export backup
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            Restore
          </Button>
        </div>
        {backupError && <p className="text-xs text-red-400">{backupError}</p>}
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onImportBackup(f)
            e.target.value = ''
          }}
        />
      </GlassCard>

      <GlassCard className="space-y-2">
        <h3 className="font-medium flex items-center gap-2">
          <Shield size={16} className="text-brand" /> Privacy
        </h3>
        <p className="text-xs text-white/45">
          No accounts, no servers, no tracking. Birthdays leave your device only when you share a link or file yourself
          — share links carry the data inside the link itself.
        </p>
      </GlassCard>

      <AppVersion />
    </div>
  )
}
