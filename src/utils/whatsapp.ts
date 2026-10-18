// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.

export interface ContactPhone {
  number: string
  /** E.164 (+41791234567) when Android could normalise it. */
  normalized?: string
  type: 'mobile' | 'home' | 'work' | 'other'
}

const E164 = /^\+\d{8,15}$/

/** Numbers WhatsApp can open: international format only, mobiles first, each once. */
export function whatsappCandidates(phones: ContactPhone[]): ContactPhone[] {
  const usable = phones.filter((p) => p.normalized && E164.test(p.normalized))
  const sorted = [...usable.filter((p) => p.type === 'mobile'), ...usable.filter((p) => p.type !== 'mobile')]
  const seen = new Set<string>()
  return sorted.filter((p) => {
    if (seen.has(p.normalized!)) return false
    seen.add(p.normalized!)
    return true
  })
}

/** Short non-reversible tag for remembering a chosen number without storing it (FNV-1a). */
export function hashNumber(normalized: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(36)
}

/** Opens that person's WhatsApp chat with the message pre-filled. */
export function whatsappLink(normalized: string, text: string): string {
  return `https://wa.me/${normalized.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
}
