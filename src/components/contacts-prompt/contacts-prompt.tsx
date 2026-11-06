// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { useEffect } from 'react'
import { useAppData } from '../../context/app-data'
import { contactDraft, useContacts } from '../../context/contacts'
import { STORAGE_KEYS } from '../../data/storage'
import { useStorage } from '../../hooks/useStorage'
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog'

/** Asked once on first start (Android only): add every contact that has a birthday. */
export function ContactsPrompt({ onResult }: { onResult: (text: string) => void }) {
  const { people, addPerson } = useAppData()
  const { api, syncNow } = useContacts()
  const [prompted, setPrompted] = useStorage(STORAGE_KEYS.contactsPrompted, false)
  const hasPeople = people.length > 0

  // Anyone with people is past first start, including installs older than this prompt.
  useEffect(() => {
    if (hasPeople) setPrompted(true)
  }, [hasPeople, setPrompted])

  const syncAll = async () => {
    if (!api) return
    try {
      if (!(await api.requestRead())) return onResult('No access to contacts. You can sync later in Settings')
      let added = 0
      // ponytail: one storage write per person (O(n²) bytes), add a bulk addPeople if huge address books stall.
      for (const c of await api.list()) {
        if (!c.birthday) continue
        addPerson(contactDraft(c, c.birthday))
        added++
      }
      syncNow()
      onResult(
        added ? `Added ${added} ${added === 1 ? 'birthday' : 'birthdays'} 🎉` : 'No contacts have a birthday yet',
      )
    } catch {
      onResult("Couldn't read your contacts. You can sync later in Settings")
    }
  }

  return (
    <ConfirmDialog
      open={!!api && !prompted && !hasPeople}
      onClose={() => setPrompted(true)}
      onConfirm={syncAll}
      title="Sync birthdays from contacts?"
      message="Add everyone in your contacts who has a birthday. Their birthdays then stay in step with your phone. You can change this anytime in Settings."
      confirmLabel="Sync all"
    />
  )
}
