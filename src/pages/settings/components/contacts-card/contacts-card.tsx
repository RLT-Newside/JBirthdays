// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { Contact, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../../components/button/button'
import { ConfirmDialog } from '../../../../components/confirm-dialog/confirm-dialog'
import { GlassCard } from '../../../../components/glass-card/glass-card'
import { useAppData } from '../../../../context/app-data'
import { useContacts } from '../../../../context/contacts'

/** Android only: how many people are linked, manual sync, choose/unlink contacts. */
export function ContactsCard() {
  const { people, setContactPickerOpen } = useAppData()
  const { available, syncing, lastResult, syncNow, unlinkAll } = useContacts()
  const [confirmUnlink, setConfirmUnlink] = useState(false)
  if (!available) return null

  const linked = people.filter((p) => p.contact).length
  const changed = lastResult ? lastResult.pulled + lastResult.pushed : 0

  return (
    <GlassCard className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <Contact size={16} className="text-brand" /> Contacts
        </h3>
        <span className="text-xs text-white/45">{linked} linked</span>
      </div>
      <p className="text-xs text-white/45">
        Birthdays of linked people stay in step with your phone's contacts. Names stay as they are.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setContactPickerOpen(true)}>
          Choose contacts
        </Button>
        <Button
          variant="secondary"
          onClick={syncNow}
          disabled={syncing || linked === 0}
          className="flex items-center gap-1.5"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          Sync now
        </Button>
        {linked > 0 && (
          <Button variant="ghost" onClick={() => setConfirmUnlink(true)}>
            Unlink all
          </Button>
        )}
      </div>
      {lastResult && !syncing && (
        <p className="text-[11px] text-white/40">
          Updated {changed}
          {lastResult.failed > 0 && <span className="text-red-400/80"> · {lastResult.failed} failed</span>}
        </p>
      )}
      <ConfirmDialog
        open={confirmUnlink}
        onClose={() => setConfirmUnlink(false)}
        onConfirm={unlinkAll}
        title="Unlink all contacts?"
        message="People stay in JBirthdays with their birthdays; nothing changes in your contacts."
        confirmLabel="Unlink all"
      />
    </GlassCard>
  )
}
