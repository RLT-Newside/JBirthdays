// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { applyBackup, type Backup } from '../../utils/backup'
import { Button } from '../button/button'
import { Modal } from '../modal/modal'

interface Props {
  backup: Backup | null
  onClose: () => void
}

/** Confirm restoring a full backup, then reload so every stored hook re-reads. */
export function BackupImportDialog({ backup, onClose }: Props) {
  if (!backup) return null
  const people = Array.isArray(backup.data.bday_people) ? backup.data.bday_people.length : 0
  const apply = (mode: 'merge' | 'replace') => {
    applyBackup(backup, mode)
    window.location.reload()
  }
  return (
    <Modal open onClose={onClose} title="Restore backup">
      <p className="text-sm text-white/60 mb-2">
        Backup contains {people} {people === 1 ? 'person' : 'people'}
        {backup.exportedAt && ` (from ${new Date(backup.exportedAt).toLocaleDateString()})`}.
      </p>
      <p className="text-xs text-white/40 mb-6">
        Merge adds what's missing and keeps your current data. Replace wipes this device's birthdays first.
      </p>
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={() => apply('replace')}>
          Replace
        </Button>
        <Button onClick={() => apply('merge')}>Merge</Button>
      </div>
    </Modal>
  )
}
