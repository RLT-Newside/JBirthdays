// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { Check, ChevronDown } from 'lucide-react'
import { type KeyboardEvent, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBackHandler } from '../../hooks/useBackButton'

export interface SelectOption<T extends string | number> {
  value: T
  label: string
}

interface Props<T extends string | number> {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  id?: string
  'aria-label'?: string
  /** `field` matches text inputs; `pill` is the compact inline chip. */
  variant?: 'field' | 'pill'
  /** Lay options out as a grid (e.g. 7 for days of a month). */
  columns?: number
  className?: string
}

interface Placement {
  left: number
  width: number
  maxHeight: number
  top?: number
  bottom?: number
}

const GAP = 6
const MAX_LIST_HEIGHT = 288
const MIN_PANEL_WIDTH = { field: 0, pill: 176 }
const GRID_MIN_WIDTH = 252

/**
 * Themed replacement for the native <select>: a combobox trigger styled like
 * `.field` and a glass listbox rendered in a portal (so modals can't clip it).
 * Keyboard: arrows/Home/End move, Enter/Space pick, Esc closes, letters jump.
 */
export function Select<T extends string | number>({
  value,
  options,
  onChange,
  id,
  'aria-label': ariaLabel,
  variant = 'field',
  columns,
  className = '',
}: Props<T>) {
  const autoId = useId()
  const triggerId = id ?? autoId
  const listId = `${autoId}-list`
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [place, setPlace] = useState<Placement | null>(null)

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  const selected = options[selectedIndex]

  const close = useCallback(() => setOpen(false), [])
  useBackHandler(() => {
    close()
    return true
  }, open)

  const openList = () => {
    setActive(selectedIndex)
    setOpen(true)
  }

  const pick = (i: number) => {
    const opt = options[i]
    if (opt && opt.value !== value) onChange(opt.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  // Position under the trigger, flipping above when there's more room there.
  const measure = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const minWidth = columns ? GRID_MIN_WIDTH : MIN_PANEL_WIDTH[variant]
    const width = Math.min(Math.max(r.width, minWidth), window.innerWidth - 16)
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8)
    const below = window.innerHeight - r.bottom - GAP - 8
    const above = r.top - GAP - 8
    if (below >= Math.min(MAX_LIST_HEIGHT, 200) || below >= above) {
      setPlace({ left, width, top: r.bottom + GAP, maxHeight: Math.min(MAX_LIST_HEIGHT, below) })
    } else {
      setPlace({ left, width, bottom: window.innerHeight - r.top + GAP, maxHeight: Math.min(MAX_LIST_HEIGHT, above) })
    }
  }, [columns, variant])

  useLayoutEffect(() => {
    if (!open) return
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, measure])

  // Close on any press outside the trigger and the list.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || listRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [open])

  // Keep the highlighted option in view (also centres the current value on open).
  useEffect(() => {
    if (!open || !place) return
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, place, active])

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1
    const step = columns ?? 1
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openList()
      }
      return
    }
    const move = (i: number) => {
      e.preventDefault()
      setActive(Math.min(last, Math.max(0, i)))
    }
    switch (e.key) {
      case 'ArrowDown':
        return move(active + step)
      case 'ArrowUp':
        return move(active - step)
      case 'ArrowRight':
        return columns ? move(active + 1) : undefined
      case 'ArrowLeft':
        return columns ? move(active - 1) : undefined
      case 'Home':
        return move(0)
      case 'End':
        return move(last)
      case 'Enter':
      case ' ':
        e.preventDefault()
        return pick(active)
      case 'Escape':
        e.preventDefault()
        e.stopPropagation()
        return close()
      case 'Tab':
        return close()
      default:
        if (e.key.length === 1) {
          const k = e.key.toLowerCase()
          const from = options.findIndex((o, i) => i > active && o.label.toLowerCase().startsWith(k))
          const hit = from >= 0 ? from : options.findIndex((o) => o.label.toLowerCase().startsWith(k))
          if (hit >= 0) move(hit)
        }
    }
  }

  const triggerClass =
    variant === 'pill'
      ? 'field-pill inline-flex items-center gap-1'
      : 'field flex items-center justify-between gap-2 text-left'

  return (
    <>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        data-open={open || undefined}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        className={`${triggerClass} ${className}`}
      >
        <span className="truncate">{selected?.label ?? ''}</span>
        <ChevronDown
          size={variant === 'pill' ? 12 : 16}
          className={`shrink-0 text-white/45 transition-transform duration-200 ${open ? 'rotate-180 text-brand' : ''}`}
        />
      </button>

      {open &&
        place &&
        createPortal(
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={triggerId}
            className={`select-panel fixed z-[90] p-1.5 overflow-y-auto overscroll-contain ${
              columns ? 'grid gap-1' : 'flex flex-col gap-0.5'
            } ${place.top === undefined ? 'origin-bottom' : 'origin-top'}`}
            style={{
              left: place.left,
              width: place.width,
              top: place.top,
              bottom: place.bottom,
              maxHeight: place.maxHeight,
              gridTemplateColumns: columns ? `repeat(${columns}, minmax(0, 1fr))` : undefined,
            }}
          >
            {options.map((o, i) => {
              const isSelected = i === selectedIndex
              const isActive = i === active
              return (
                <div
                  key={String(o.value)}
                  id={`${listId}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onPointerMove={() => setActive(i)}
                  onClick={() => pick(i)}
                  onKeyDown={() => {}}
                  className={`select-option ${columns ? 'justify-center px-0' : 'justify-between px-3'} ${
                    isSelected ? 'is-selected' : ''
                  } ${isActive ? 'is-active' : ''}`}
                >
                  <span className="truncate">{o.label}</span>
                  {isSelected && !columns && <Check size={15} className="shrink-0" />}
                </div>
              )
            })}
          </div>,
          document.body,
        )}
    </>
  )
}
