// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import type { Birthday } from '../../types'

/** One birthday read from another app's export. */
export interface ExternalEntry extends Birthday {
  name: string
}

/** A row that looked like a birthday but couldn't be used, shown in the import preview. */
export interface SkippedEntry {
  label: string
  reason: string
}

export interface ExternalResult {
  entries: ExternalEntry[]
  skipped: SkippedEntry[]
}
