// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { useMemo, useState } from 'react'
import { useAppData } from '../../context/app-data'
import { exportJsonFile } from '../../utils/fileExport'
import { shareText } from '../../utils/greeting'
import { type ImportSource, parseImportText, readFileText } from '../../utils/importSource'
import { buildPacket, buildShareLink } from '../../utils/share'
import { type SelectMode, ShareView } from './share.view'

export function ShareContainer() {
  const { people, tags, gifts, settings, updateSettings, setPendingImport, setPendingBackup } = useAppData()
  const [mode, setMode] = useState<SelectMode>('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [picked, setPicked] = useState<string[]>([])
  const [includePrivate, setIncludePrivate] = useState(false)
  const [pasted, setPasted] = useState('')
  const [status, setStatus] = useState<{ text: string; error?: boolean }>()
  const [busy, setBusy] = useState(false)

  const selection = useMemo(() => {
    if (mode === 'all') return people
    if (mode === 'tags') return people.filter((p) => p.tagIds.some((t) => selectedTags.includes(t)))
    return people.filter((p) => picked.includes(p.id))
  }, [mode, people, selectedTags, picked])

  const flash = (text: string, error = false) => {
    setStatus({ text, error })
    setTimeout(() => setStatus(undefined), 3000)
  }

  const packet = () => buildPacket(selection, tags, gifts, { includePrivate, from: settings.shareName })

  const shareLink = async () => {
    setBusy(true)
    try {
      const link = await buildShareLink(packet())
      const n = selection.length
      const who = settings.shareName?.trim() ? `${settings.shareName.trim()} shared` : 'Here are'
      const r = await shareText(
        `${who} ${n} ${n === 1 ? 'birthday' : 'birthdays'} — add them to JBirthdays:`,
        'Birthdays',
        link,
      )
      if (r === 'copied') flash('Link copied to clipboard')
      else if (r === 'failed') flash('Could not share link', true)
    } catch {
      flash('Could not build link', true)
    } finally {
      setBusy(false)
    }
  }

  const exportFile = async () => {
    const date = new Date().toISOString().slice(0, 10)
    try {
      await exportJsonFile(packet(), `birthdays-${date}.jbday.json`, 'Share birthdays')
    } catch {
      flash('Export failed', true)
    }
  }

  const route = (src: ImportSource | null) => {
    if (!src) return flash("That doesn't look like a JBirthdays link or file", true)
    if (src.kind === 'packet') setPendingImport(src.packet)
    else setPendingBackup(src.backup)
    setPasted('')
  }

  const importPasted = async () => route(await parseImportText(pasted))

  const importFile = async (file: File) => {
    try {
      route(await parseImportText(await readFileText(file)))
    } catch {
      flash('Could not read file', true)
    }
  }

  return (
    <ShareView
      people={people}
      tags={tags}
      mode={mode}
      onMode={setMode}
      selectedTags={selectedTags}
      onToggleTag={(id) => setSelectedTags((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
      picked={picked}
      onTogglePick={(id) => setPicked((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
      selectionCount={selection.length}
      includePrivate={includePrivate}
      onIncludePrivate={setIncludePrivate}
      shareName={settings.shareName ?? ''}
      onShareName={(shareName) => updateSettings({ shareName })}
      busy={busy}
      onShareLink={shareLink}
      onExportFile={exportFile}
      pasted={pasted}
      onPasted={setPasted}
      onImportPasted={importPasted}
      onImportFile={importFile}
      status={status}
    />
  )
}
