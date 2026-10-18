// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { Check, ExternalLink, Gift, MessageCircleHeart, Pencil, Plus, RotateCcw, Trash2, Undo2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAppData } from '../../context/app-data'
import {
  countdownLabel,
  daysUntil,
  formatBirthday,
  isMilestone,
  nextOccurrence,
  turningAge,
} from '../../utils/birthday'
import { shareText } from '../../utils/greeting'
import { pickTemplate, renderTemplate } from '../../utils/templates'
import { Avatar } from '../avatar/avatar'
import { Button } from '../button/button'
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog'
import { Modal } from '../modal/modal'
import { TagChip } from '../tag-chip/tag-chip'

export function PersonDetailModal() {
  const {
    viewingId,
    setViewingId,
    setEditingId,
    people,
    tags,
    gifts,
    templates,
    settings,
    deletePerson,
    addGift,
    updateGift,
    deleteGift,
  } = useAppData()
  const person = people.find((p) => p.id === viewingId)
  const open = !!person

  const [message, setMessage] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [giftText, setGiftText] = useState('')
  const [giftLink, setGiftLink] = useState('')
  const [showLink, setShowLink] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [toast, setToast] = useState<string>()

  const today = new Date()
  const template = person
    ? (templates.find((t) => t.id === templateId) ?? pickTemplate(person, templates, settings.defaultTemplateId))
    : undefined

  useEffect(() => {
    if (!person) return
    setTemplateId('')
    setGiftText('')
    setGiftLink('')
    setShowLink(false)
    setToast(undefined)
  }, [viewingId])

  useEffect(() => {
    if (person && template) setMessage(renderTemplate(template.text, person, new Date()))
  }, [viewingId, template?.id, template?.text, person?.name, person?.year])

  const personGifts = useMemo(() => gifts.filter((g) => g.personId === viewingId), [gifts, viewingId])
  const ideas = personGifts.filter((g) => g.givenYear === undefined)
  const history = personGifts
    .filter((g) => g.givenYear !== undefined)
    .sort((a, b) => (b.givenYear ?? 0) - (a.givenYear ?? 0))

  if (!person) return null

  const days = daysUntil(person, today)
  const age = turningAge(person, today)
  const next = nextOccurrence(person, today)
  const personTags = tags.filter((t) => person.tagIds.includes(t.id))
  const giftYear = next.getFullYear()

  const flash = (text: string) => {
    setToast(text)
    setTimeout(() => setToast(undefined), 2500)
  }

  const send = async () => {
    const r = await shareText(message)
    if (r === 'copied') flash('Copied — paste it into your chat')
    else if (r === 'failed') flash('Could not open share sheet')
  }

  const submitGift = () => {
    const text = giftText.trim()
    if (!text) return
    const link = giftLink.trim()
    addGift(person.id, text, /^https?:\/\//i.test(link) ? { link } : {})
    setGiftText('')
    setGiftLink('')
    setShowLink(false)
  }

  return (
    <>
      <Modal open={open} onClose={() => setViewingId(null)} title={person.name}>
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar name={person.name} size={64} highlight={days === 0} />
            <div className="min-w-0">
              <div className="text-sm text-white/60">{formatBirthday(person)}</div>
              <div className="font-heading text-3xl text-brand leading-none mt-1">{countdownLabel(days)}</div>
              {age !== undefined && (
                <div className={`text-sm mt-1 ${isMilestone(age) ? 'text-brand font-semibold' : 'text-white/60'}`}>
                  Turns {age}
                  {isMilestone(age) && ' — milestone ★'}
                </div>
              )}
            </div>
          </div>

          {personTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {personTags.map((t) => (
                <TagChip key={t.id} tag={t} active />
              ))}
            </div>
          )}

          {person.notes && (
            <p className="text-sm text-white/70 whitespace-pre-wrap glass rounded-xl p-3">{person.notes}</p>
          )}

          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="section-head mb-0 flex items-center gap-1.5">
                <MessageCircleHeart size={14} /> Send wishes
              </h3>
              <select
                aria-label="Template"
                className="field-pill"
                value={template?.id}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#1a1a1a]">
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              aria-label="Message"
              className="field resize-none"
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="flex gap-2 mt-2">
              <Button className="flex-1" onClick={send} disabled={!message.trim()}>
                Send greeting
              </Button>
              <Button
                variant="ghost"
                aria-label="Reset message"
                onClick={() => template && setMessage(renderTemplate(template.text, person, new Date()))}
              >
                <RotateCcw size={16} />
              </Button>
            </div>
          </section>

          <section>
            <h3 className="section-head flex items-center gap-1.5">
              <Gift size={14} /> Gift ideas
            </h3>
            {ideas.length === 0 && (
              <p className="text-xs text-white/35 mb-2">No ideas yet. Jot one down when it hits you.</p>
            )}
            <ul className="space-y-1.5 mb-2">
              {ideas.map((g) => (
                <li key={g.id} className="flex items-center gap-2 glass rounded-xl px-3 py-2">
                  <span className="flex-1 text-sm min-w-0 truncate">{g.text}</span>
                  {g.link && (
                    <a
                      href={g.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open link"
                      className="p-1 text-white/40 hover:text-white"
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}
                  <button
                    type="button"
                    aria-label={`Mark "${g.text}" as given in ${giftYear}`}
                    title={`Given for ${giftYear}`}
                    onClick={() => updateGift(g.id, { givenYear: giftYear })}
                    className="p-1 text-white/40 hover:text-brand press-scale"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete "${g.text}"`}
                    onClick={() => deleteGift(g.id)}
                    className="p-1 text-white/30 hover:text-red-400 press-scale"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input
                aria-label="New gift idea"
                className="field"
                placeholder="Add an idea…"
                maxLength={300}
                value={giftText}
                onChange={(e) => setGiftText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitGift()}
              />
              <Button variant="secondary" aria-label="Add gift idea" onClick={submitGift} disabled={!giftText.trim()}>
                <Plus size={16} />
              </Button>
            </div>
            {showLink ? (
              <input
                aria-label="Gift link"
                className="field mt-2"
                placeholder="https://… (optional)"
                value={giftLink}
                onChange={(e) => setGiftLink(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitGift()}
              />
            ) : (
              <button type="button" onClick={() => setShowLink(true)} className="text-[11px] text-white/40 mt-1.5">
                + add link
              </button>
            )}

            {history.length > 0 && (
              <div className="mt-4">
                <h4 className="label-caption mb-2">Already given</h4>
                <ul className="space-y-1">
                  {history.map((g) => (
                    <li key={g.id} className="flex items-center gap-2 text-sm text-white/50 px-1">
                      <span className="text-xs tabular-nums text-white/35 w-10">{g.givenYear}</span>
                      <span className="flex-1 truncate line-through decoration-white/20">{g.text}</span>
                      <button
                        type="button"
                        aria-label={`Move "${g.text}" back to ideas`}
                        onClick={() => updateGift(g.id, { givenYear: undefined })}
                        className="p-1 text-white/30 hover:text-white press-scale"
                      >
                        <Undo2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <div className="flex gap-3 pt-1">
            <Button
              variant="secondary"
              className="flex-1 flex items-center justify-center gap-2"
              onClick={() => setEditingId(person.id)}
            >
              <Pencil size={15} /> Edit
            </Button>
            <Button variant="danger" aria-label="Delete person" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={15} />
            </Button>
          </div>

          {toast && (
            <div role="status" className="text-center text-xs text-brand animate-fade-in">
              {toast}
            </div>
          )}
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deletePerson(person.id)
          setViewingId(null)
        }}
        title="Delete birthday?"
        message={`${person.name} and their gift ideas will be removed from this device.`}
        confirmLabel="Delete"
        danger
      />
    </>
  )
}
