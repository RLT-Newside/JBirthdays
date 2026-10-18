// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'

export type ShareTextResult = 'shared' | 'copied' | 'failed'

/**
 * Hand text to the system share sheet (WhatsApp, SMS, Signal…). Falls back to
 * the clipboard where no share sheet exists (most desktop browsers).
 */
export async function shareText(text: string, title?: string, url?: string): Promise<ShareTextResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({ title, text, url })
      return 'shared'
    } catch {
      // User dismissed the sheet, or no target app; fall back to copy.
    }
  } else if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'failed'
    }
  }
  try {
    await navigator.clipboard.writeText(url ? `${text}\n${url}` : text)
    return 'copied'
  } catch {
    return 'failed'
  }
}
