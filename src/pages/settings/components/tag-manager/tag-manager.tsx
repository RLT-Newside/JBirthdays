// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { Tags, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '../../../../components/confirm-dialog/confirm-dialog'
import { GlassCard } from '../../../../components/glass-card/glass-card'
import { useAppData } from '../../../../context/app-data'
import type { Tag } from '../../../../types'
import { TAG_COLORS } from '../../../../utils/importMerge'

export function TagManager() {
  const { tags, people, updateTag, deleteTag } = useAppData()
  const [deleting, setDeleting] = useState<Tag | null>(null)

  const nextColor = (c: string) => TAG_COLORS[(TAG_COLORS.indexOf(c) + 1) % TAG_COLORS.length]

  return (
    <GlassCard className="space-y-3">
      <h3 className="font-medium flex items-center gap-2">
        <Tags size={16} className="text-brand" /> Tags
      </h3>
      {tags.length === 0 && <p className="text-xs text-white/40">Create tags from a person's edit screen.</p>}
      <ul className="space-y-2">
        {tags.map((t) => {
          const count = people.filter((p) => p.tagIds.includes(t.id)).length
          return (
            <li key={t.id} className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`Change colour of ${t.name}`}
                onClick={() => updateTag(t.id, { color: nextColor(t.color) })}
                className="w-6 h-6 rounded-full shrink-0 press-scale"
                style={{ background: t.color }}
              />
              <input
                aria-label="Tag name"
                className="field min-h-9 py-1.5"
                defaultValue={t.name}
                maxLength={40}
                onBlur={(e) => {
                  const name = e.target.value.trim()
                  if (name && name !== t.name) updateTag(t.id, { name })
                  else e.target.value = t.name
                }}
              />
              <span className="text-xs text-white/35 w-6 text-right">{count}</span>
              <button
                type="button"
                aria-label={`Delete ${t.name}`}
                onClick={() => setDeleting(t)}
                className="p-1.5 text-white/30 hover:text-red-400 press-scale"
              >
                <Trash2 size={15} />
              </button>
            </li>
          )
        })}
      </ul>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteTag(deleting.id)}
        title="Delete tag?"
        message={`"${deleting?.name}" will be removed from everyone. The people stay.`}
        confirmLabel="Delete"
        danger
      />
    </GlassCard>
  )
}
