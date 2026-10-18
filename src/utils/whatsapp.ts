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

/** Opens that person's WhatsApp chat with the message pre-filled. */
export function whatsappLink(normalized: string, text: string): string {
  return `https://wa.me/${normalized.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
}
