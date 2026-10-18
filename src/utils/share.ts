// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import type { GiftIdea, Person, Tag } from '../types'
import { daysInMonth } from './birthday'

/**
 * One-time share format. A friend receives a copy — nothing syncs back.
 * Local-only fields (reminders, template choice) are stripped; notes and gift
 * ideas travel only when the sender opts in, since they are usually private.
 */
export interface SharedPerson {
  id: string
  name: string
  month: number
  day: number
  year?: number
  tags: string[]
  notes?: string
}

export interface SharedGift {
  personId: string
  text: string
  link?: string
  price?: string
  givenYear?: number
}

export interface SharePacket {
  app: 'jbirthdays'
  version: 1
  from?: string
  people: SharedPerson[]
  gifts?: SharedGift[]
}

export const SHARE_HASH_KEY = 'import'
/** Guard against absurd payloads in links/files (≈ thousands of people). */
const MAX_ENCODED_LENGTH = 200_000
const MAX_PEOPLE = 5000

export interface BuildOptions {
  includePrivate: boolean
  from?: string
}

export function buildPacket(
  people: Person[],
  tags: Tag[],
  gifts: GiftIdea[],
  { includePrivate, from }: BuildOptions,
): SharePacket {
  const tagName = new Map(tags.map((t) => [t.id, t.name]))
  const ids = new Set(people.map((p) => p.id))
  const packet: SharePacket = {
    app: 'jbirthdays',
    version: 1,
    people: people.map((p) => ({
      id: p.id,
      name: p.name,
      month: p.month,
      day: p.day,
      ...(p.year !== undefined && { year: p.year }),
      tags: p.tagIds.map((id) => tagName.get(id)).filter((n): n is string => !!n),
      ...(includePrivate && p.notes && { notes: p.notes }),
    })),
  }
  if (from?.trim()) packet.from = from.trim()
  if (includePrivate) {
    packet.gifts = gifts
      .filter((g) => ids.has(g.personId))
      .map((g) => ({
        personId: g.personId,
        text: g.text,
        ...(g.link && { link: g.link }),
        ...(g.price && { price: g.price }),
        ...(g.givenYear !== undefined && { givenYear: g.givenYear }),
      }))
  }
  return packet
}

const isStr = (v: unknown): v is string => typeof v === 'string'
const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max

/** Validate untrusted input (link, file, intent) into a clean packet, or null. */
export function parsePacket(raw: unknown): SharePacket | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (r.app !== 'jbirthdays' || r.version !== 1 || !Array.isArray(r.people)) return null
  if (r.people.length > MAX_PEOPLE) return null

  const people: SharedPerson[] = []
  for (const item of r.people) {
    if (typeof item !== 'object' || item === null) continue
    const p = item as Record<string, unknown>
    if (!isStr(p.id) || !isStr(p.name) || !p.name.trim()) continue
    if (!isInt(p.month, 1, 12) || !isInt(p.day, 1, daysInMonth(p.month))) continue
    people.push({
      id: p.id.slice(0, 64),
      name: p.name.trim().slice(0, 100),
      month: p.month,
      day: p.day,
      ...(isInt(p.year, 1900, 2100) && { year: p.year }),
      tags: Array.isArray(p.tags)
        ? p.tags
            .filter(isStr)
            .map((t) => t.trim().slice(0, 40))
            .filter(Boolean)
        : [],
      ...(isStr(p.notes) && p.notes && { notes: p.notes.slice(0, 2000) }),
    })
  }

  const packet: SharePacket = { app: 'jbirthdays', version: 1, people }
  if (isStr(r.from) && r.from.trim()) packet.from = r.from.trim().slice(0, 60)
  if (Array.isArray(r.gifts)) {
    const ids = new Set(people.map((p) => p.id))
    packet.gifts = r.gifts.flatMap((item): SharedGift[] => {
      if (typeof item !== 'object' || item === null) return []
      const g = item as Record<string, unknown>
      if (!isStr(g.personId) || !ids.has(g.personId) || !isStr(g.text) || !g.text.trim()) return []
      return [
        {
          personId: g.personId,
          text: g.text.trim().slice(0, 300),
          ...(isStr(g.link) && /^https?:\/\//i.test(g.link) && { link: g.link.slice(0, 500) }),
          ...(isStr(g.price) && g.price && { price: g.price.slice(0, 30) }),
          ...(isInt(g.givenYear, 1900, 2100) && { givenYear: g.givenYear }),
        },
      ]
    })
  }
  return packet
}

// ─── Link encoding: JSON → deflate-raw → base64url ───

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const writer = stream.writable.getWriter()
  // Don't await the write: it only resolves once the readable side is consumed.
  writer.write(bytes as BufferSource).catch(() => {})
  writer.close().catch(() => {})
  return new Uint8Array(await new Response(stream.readable).arrayBuffer())
}

export async function encodePacket(packet: SharePacket): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(packet))
  return toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))
}

export async function decodePacket(encoded: string): Promise<SharePacket | null> {
  if (!encoded || encoded.length > MAX_ENCODED_LENGTH || !/^[A-Za-z0-9_-]+$/.test(encoded)) return null
  try {
    const bytes = await pipe(fromBase64Url(encoded), new DecompressionStream('deflate-raw'))
    if (bytes.length > MAX_ENCODED_LENGTH * 20) return null
    return parsePacket(JSON.parse(new TextDecoder().decode(bytes)))
  } catch {
    return null
  }
}

/** Public URL the app is served from; links open there. */
export const SHARE_BASE_URL = 'https://jbirthdays.vercel.app/'

export async function buildShareLink(packet: SharePacket, base = SHARE_BASE_URL): Promise<string> {
  return `${base}#${SHARE_HASH_KEY}=${await encodePacket(packet)}`
}

/** Pull the encoded payload out of a location hash like `#import=abc`. */
export function readShareHash(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  return params.get(SHARE_HASH_KEY)
}
