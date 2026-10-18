// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { MessageSquareText, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../../components/button/button'
import { FormField } from '../../../../components/form-field/form-field'
import { GlassCard } from '../../../../components/glass-card/glass-card'
import { Modal } from '../../../../components/modal/modal'
import { useAppData } from '../../../../context/app-data'
import type { Person, Template } from '../../../../types'
import { renderTemplate } from '../../../../utils/templates'

const SAMPLE: Person = {
  id: 's',
  name: 'Lena Müller',
  month: 1,
  day: 1,
  year: 1998,
  tagIds: [],
  createdAt: 0,
  updatedAt: 0,
}

export function TemplateManager() {
  const { templates, settings, saveTemplate, deleteTemplate, updateSettings } = useAppData()
  const [editing, setEditing] = useState<Partial<Template> | null>(null)

  const defaultId = settings.defaultTemplateId ?? templates[0]?.id
  const preview = editing?.text ? renderTemplate(editing.text, SAMPLE, new Date(2026, 0, 1)) : ''

  return (
    <GlassCard className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <MessageSquareText size={16} className="text-brand" /> Greeting templates
        </h3>
        <button
          type="button"
          aria-label="New template"
          onClick={() => setEditing({ name: '', text: '' })}
          className="p-1.5 text-white/50 hover:text-white press-scale"
        >
          <Plus size={18} />
        </button>
      </div>
      <ul className="space-y-2">
        {templates.map((t) => (
          <li key={t.id} className="flex items-start gap-2">
            <button
              type="button"
              aria-label={`Make ${t.name} the default`}
              aria-pressed={t.id === defaultId}
              onClick={() => updateSettings({ defaultTemplateId: t.id })}
              className={`p-1 press-scale ${t.id === defaultId ? 'text-brand' : 'text-white/20'}`}
            >
              <Star size={15} fill={t.id === defaultId ? 'currentColor' : 'none'} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-sm">{t.name}</div>
              <div className="text-xs text-white/40 truncate">{t.text}</div>
            </div>
            <button
              type="button"
              aria-label={`Edit ${t.name}`}
              onClick={() => setEditing(t)}
              className="p-1 text-white/40 hover:text-white press-scale"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              aria-label={`Delete ${t.name}`}
              disabled={templates.length <= 1}
              onClick={() => deleteTemplate(t.id)}
              className="p-1 text-white/30 hover:text-red-400 press-scale disabled:opacity-30"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit template' : 'New template'}>
        <div className="space-y-4">
          <FormField
            label="Name"
            value={editing?.name ?? ''}
            maxLength={40}
            onChange={(e) => setEditing((t) => ({ ...t, name: e.target.value }))}
          />
          <FormField
            label="Message"
            multiline
            rows={3}
            maxLength={500}
            value={editing?.text ?? ''}
            onChange={(e) => setEditing((t) => ({ ...t, text: e.target.value }))}
          />
          <p className="text-[11px] text-white/40">
            Placeholders: <code>{'{name}'}</code> first name, <code>{'{fullname}'}</code>, <code>{'{age}'}</code>,{' '}
            <code>{'{ordinal}'}</code> (28th). Age parts vanish when the year is unknown.
          </p>
          {preview && <p className="text-sm glass rounded-xl p-3 text-white/70">{preview}</p>}
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={!editing?.name?.trim() || !editing?.text?.trim()}
              onClick={() => {
                if (!editing?.name || !editing.text) return
                saveTemplate({ id: editing.id, name: editing.name.trim(), text: editing.text.trim() })
                setEditing(null)
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </GlassCard>
  )
}
