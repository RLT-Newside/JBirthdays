// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { useMemo } from 'react'
import { useAppData } from '../../context/app-data'
import { formatBirthday } from '../../utils/birthday'
import { planImport } from '../../utils/importMerge'
import type { PendingImport } from '../../utils/importSource'
import { Button } from '../button/button'
import { Modal } from '../modal/modal'

const ORIGIN_LABEL = { calendar: 'calendar file', contacts: 'contacts file', spreadsheet: 'spreadsheet' } as const

interface Props {
  pending: PendingImport | null
  onClose: () => void
  onImported: (count: number) => void
}

export function ImportDialog({ pending, onClose, onImported }: Props) {
  const packet = pending?.packet ?? null
  const skipped = pending?.skipped ?? []
  const { people, tags, gifts, importPacket } = useAppData()
  const plan = useMemo(
    () => (packet ? planImport(packet, { people, tags, gifts }) : null),
    [packet, people, tags, gifts],
  )

  if (!packet || !plan) return null

  const nothingNew = plan.added.length === 0 && plan.giftCount === 0

  return (
    <Modal open onClose={onClose} title="Import birthdays">
      <div className="space-y-4">
        <p className="text-sm text-white/60">
          {pending?.origin ? (
            <>
              Found {packet.people.length} {packet.people.length === 1 ? 'birthday' : 'birthdays'} in this{' '}
              {ORIGIN_LABEL[pending.origin]}.
            </>
          ) : packet.from ? (
            <>
              <span className="text-brand font-medium">{packet.from}</span> shared {packet.people.length}{' '}
              {packet.people.length === 1 ? 'birthday' : 'birthdays'} with you.
            </>
          ) : (
            <>
              {packet.people.length} {packet.people.length === 1 ? 'birthday' : 'birthdays'} shared with you.
            </>
          )}
        </p>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="glass rounded-xl p-3">
            <div className="font-heading text-3xl text-brand">{plan.added.length}</div>
            <div className="label-caption">New</div>
          </div>
          <div className="glass rounded-xl p-3">
            <div className="font-heading text-3xl">{plan.matched.length}</div>
            <div className="label-caption">Already saved</div>
          </div>
        </div>

        {plan.added.length > 0 && (
          <ul className="max-h-48 overflow-y-auto space-y-1 text-sm">
            {plan.added.map((p) => (
              <li key={p.id} className="flex justify-between px-1">
                <span className="truncate">{p.name}</span>
                <span className="text-white/40 shrink-0 ml-2">{formatBirthday(p)}</span>
              </li>
            ))}
          </ul>
        )}

        {skipped.length > 0 && (
          <details className="text-xs text-white/50">
            <summary className="cursor-pointer">{skipped.length} skipped</summary>
            <ul className="mt-1 max-h-32 overflow-y-auto space-y-0.5 pl-3">
              {skipped.map((s, i) => (
                <li key={`${s.label}-${i}`}>
                  {s.label} — {s.reason}
                </li>
              ))}
            </ul>
          </details>
        )}

        <ul className="text-xs text-white/45 space-y-0.5">
          {plan.newTags.length > 0 && <li>New tags: {plan.newTags.join(', ')}</li>}
          {plan.giftCount > 0 && <li>Includes {plan.giftCount} gift ideas</li>}
          {plan.matched.length > 0 && <li>Existing entries keep your data; missing years and tags are filled in.</li>}
        </ul>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={nothingNew && plan.matched.length === 0}
            onClick={() => {
              importPacket(packet)
              onImported(plan.added.length)
            }}
          >
            {plan.added.length > 0 ? `Import ${plan.added.length}` : 'Update existing'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
