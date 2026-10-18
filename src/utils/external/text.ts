// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.

/** Split an iCalendar/vCard text into logical lines, joining folded continuations (RFC 5545/6350). */
export function unfoldLines(text: string): string[] {
  const out: string[] = []
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length > 0) out[out.length - 1] += line.slice(1)
    else out.push(line)
  }
  return out
}

/** Undo iCalendar/vCard text escaping. */
export function unescapeValue(v: string): string {
  return v.replace(/\\([\\,;nN])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c))
}

/** Split "NAME;PARAM=x:value" into the upper-cased property name and its value. */
export function splitProperty(line: string): { name: string; value: string } | null {
  const colon = line.indexOf(':')
  if (colon < 0) return null
  const name = line.slice(0, colon).split(';')[0].trim().toUpperCase()
  return { name, value: line.slice(colon + 1) }
}
