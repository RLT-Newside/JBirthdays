// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { Bell, BellOff, Info } from 'lucide-react'
import { Button } from '../../../../components/button/button'
import { GlassCard } from '../../../../components/glass-card/glass-card'
import { REMINDER_OPTIONS, reminderLabel } from '../../../../components/person-form-modal/person-form-modal'
import { useAppData } from '../../../../context/app-data'

const HOURS = Array.from({ length: 24 }, (_, h) => h)

export function ReminderSettings() {
  const { settings, updateSettings, notificationStatus, enableNotifications } = useAppData()
  const days = settings.defaultReminderDays

  return (
    <GlassCard className="space-y-4">
      <h3 className="font-medium flex items-center gap-2">
        <Bell size={16} className="text-brand" /> Reminders
      </h3>

      {notificationStatus === 'denied' && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200 space-y-2">
          <p className="flex items-center gap-2">
            <BellOff size={14} /> Notifications are blocked for JBirthdays.
          </p>
          <p className="text-amber-200/70">
            Open Android Settings → Apps → JBirthdays → Notifications and allow them, or reminders won't arrive.
          </p>
        </div>
      )}
      {notificationStatus === 'prompt' && (
        <Button onClick={enableNotifications} className="w-full">
          Turn on reminders
        </Button>
      )}
      {notificationStatus === 'unsupported' && (
        <p className="text-xs text-white/45 flex gap-2">
          <Info size={14} className="shrink-0 mt-0.5" />
          The web version can't send scheduled reminders. Install the Android app for notifications — upcoming birthdays
          still show here.
        </p>
      )}
      {notificationStatus === 'granted' && <p className="text-xs text-emerald-300/80">Notifications on ✓</p>}

      <div>
        <span className="label-caption block mb-2">Remind me by default</span>
        <div className="flex flex-wrap gap-2">
          {REMINDER_OPTIONS.map((d) => {
            const on = days.includes(d)
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  updateSettings({
                    defaultReminderDays: (on ? days.filter((x) => x !== d) : [...days, d]).sort((a, b) => b - a),
                  })
                }
                className={`text-xs px-3 py-1 rounded-full border press-scale ${
                  on ? 'border-brand bg-brand/15 text-brand' : 'border-white/[0.08] text-white/55'
                }`}
              >
                {reminderLabel(d)}
              </button>
            )
          })}
        </div>
        <p className="text-[11px] text-white/35 mt-1.5">Per-person overrides live in each person's edit screen.</p>
      </div>

      <div className="flex items-center justify-between">
        <label htmlFor="reminder-hour" className="label-caption">
          Time of day
        </label>
        <select
          id="reminder-hour"
          className="field w-auto"
          value={settings.reminderHour}
          onChange={(e) => updateSettings({ reminderHour: Number(e.target.value) })}
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, '0')}:00
            </option>
          ))}
        </select>
      </div>
    </GlassCard>
  )
}
