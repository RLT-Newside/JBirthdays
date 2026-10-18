// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { Download, FileUp, Link2, Lock } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '../../components/button/button'
import { GlassCard } from '../../components/glass-card/glass-card'
import { TagChip } from '../../components/tag-chip/tag-chip'
import type { Person, Tag } from '../../types'
import { formatBirthday } from '../../utils/birthday'

export type SelectMode = 'all' | 'tags' | 'pick'

interface Props {
  people: Person[]
  tags: Tag[]
  mode: SelectMode
  onMode: (m: SelectMode) => void
  selectedTags: string[]
  onToggleTag: (id: string) => void
  picked: string[]
  onTogglePick: (id: string) => void
  selectionCount: number
  includePrivate: boolean
  onIncludePrivate: (v: boolean) => void
  shareName: string
  onShareName: (v: string) => void
  busy: boolean
  onShareLink: () => void
  onExportFile: () => void
  pasted: string
  onPasted: (v: string) => void
  onImportPasted: () => void
  onImportFile: (f: File) => void
  status?: { text: string; error?: boolean }
}

const MODES: { id: SelectMode; label: string }[] = [
  { id: 'all', label: 'Everyone' },
  { id: 'tags', label: 'By tag' },
  { id: 'pick', label: 'Pick' },
]

export function ShareView(props: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const { people, tags, mode, selectionCount, status } = props
  const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-6 pb-4">
      <h2 className="font-heading text-3xl">Share</h2>

      <GlassCard className="space-y-4">
        <div>
          <h3 className="font-medium">Send to a friend</h3>
          <p className="text-xs text-white/45 mt-0.5">They get a copy to import. Nothing syncs, no account needed.</p>
        </div>

        <div className="flex rounded-full border border-white/[0.08] p-0.5 w-fit">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mode === m.id}
              onClick={() => props.onMode(m.id)}
              className={`text-xs px-3 py-1 rounded-full ${mode === m.id ? 'bg-white/10 text-white' : 'text-white/45'}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'tags' &&
          (tags.length === 0 ? (
            <p className="text-xs text-white/40">No tags yet — add some when editing a person.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <TagChip
                  key={t.id}
                  tag={t}
                  active={props.selectedTags.includes(t.id)}
                  onClick={() => props.onToggleTag(t.id)}
                />
              ))}
            </div>
          ))}

        {mode === 'pick' && (
          <ul className="max-h-60 overflow-y-auto space-y-1 -mx-1">
            {sorted.map((p) => (
              <li key={p.id}>
                <label className="flex items-center gap-3 px-1 py-1.5 rounded-lg hover:bg-white/[0.04]">
                  <input
                    type="checkbox"
                    checked={props.picked.includes(p.id)}
                    onChange={() => props.onTogglePick(p.id)}
                    className="check"
                  />
                  <span className="flex-1 text-sm truncate">{p.name}</span>
                  <span className="text-xs text-white/35">{formatBirthday({ month: p.month, day: p.day })}</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <input
          aria-label="Your name"
          className="field"
          placeholder="Your name (shown to your friend)"
          maxLength={60}
          value={props.shareName}
          onChange={(e) => props.onShareName(e.target.value)}
        />

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={props.includePrivate}
            onChange={(e) => props.onIncludePrivate(e.target.checked)}
            className="switch mt-0.5"
          />
          <span className="text-xs text-white/60">
            Include notes &amp; gift ideas
            <span className="block text-white/35">
              <Lock size={10} className="inline -mt-0.5" /> Off by default — gift ideas are usually a secret.
            </span>
          </span>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={props.onShareLink}
            disabled={selectionCount === 0 || props.busy}
            className="flex items-center justify-center gap-2"
          >
            <Link2 size={16} /> Share link
          </Button>
          <Button
            variant="secondary"
            onClick={props.onExportFile}
            disabled={selectionCount === 0}
            className="flex items-center justify-center gap-2"
          >
            <Download size={16} /> Export file
          </Button>
        </div>
        <p className="text-[11px] text-white/35 text-center">
          {selectionCount} {selectionCount === 1 ? 'birthday' : 'birthdays'} selected
        </p>
      </GlassCard>

      <GlassCard className="space-y-3">
        <div>
          <h3 className="font-medium">Receive</h3>
          <p className="text-xs text-white/45 mt-0.5">
            Opening a share link imports automatically. Or paste it here, or open a file: a .jbday.json share, or a
            calendar, contacts or spreadsheet export from another app.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            aria-label="Paste share link"
            className="field"
            placeholder="Paste link…"
            value={props.pasted}
            onChange={(e) => props.onPasted(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && props.onImportPasted()}
          />
          <Button variant="secondary" onClick={props.onImportPasted} disabled={!props.pasted.trim()}>
            Import
          </Button>
        </div>
        <Button
          variant="ghost"
          onClick={() => fileRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-white/[0.12]"
        >
          <FileUp size={16} /> Open file
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.jbday.json,.ics,.vcf,.csv,application/json,text/calendar,text/vcard,text/x-vcard,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) props.onImportFile(f)
            e.target.value = ''
          }}
        />
      </GlassCard>

      {status && (
        <div
          role="status"
          className={`fixed above-nav left-1/2 -translate-x-1/2 mb-4 z-40 px-4 py-2 rounded-xl text-sm animate-fade-in ${
            status.error ? 'bg-red-500/20 text-red-200' : 'bg-brand text-black font-medium'
          }`}
        >
          {status.text}
        </div>
      )}
    </div>
  )
}
