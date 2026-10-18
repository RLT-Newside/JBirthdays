// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useEffect } from 'react'

interface ImportBridge {
  getPendingImport: () => Promise<{ json: string | null }>
}

function getPlugin(): ImportBridge | null {
  if (!Capacitor.isNativePlatform()) return null
  const plugins = (window as { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor?.Plugins
  return (plugins?.ImportBridge as ImportBridge) ?? null
}

// Watches for content delivered via Android share-target / open-with intents:
// a .jbday.json file, a backup, or a share link sent as plain text. Invokes
// onShared with the raw text; the caller parses, confirms and applies it.
export function useSharedImport(onShared: (text: string) => void) {
  useEffect(() => {
    const plugin = getPlugin()
    if (!plugin) return

    const consume = async () => {
      try {
        const { json } = await plugin.getPendingImport()
        if (json) onShared(json)
      } catch {
        // Bridge unavailable — ignore.
      }
    }

    consume()
    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) consume()
    })

    return () => {
      listener.then((l) => l.remove())
    }
  }, [onShared])
}
