// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useEffect, useRef } from 'react'
import { decodePacket, readShareHash, type SharePacket } from '../utils/share'

/**
 * Picks up share links: on the web via `#import=…` in the URL (on load and on
 * hash change), on Android via the app-link intent. The hash is cleared right
 * away so a reload doesn't offer the same import again.
 */
export function useLinkImport(onPacket: (packet: SharePacket) => void, onInvalid: () => void) {
  const cb = useRef({ onPacket, onInvalid })
  cb.current = { onPacket, onInvalid }

  useEffect(() => {
    const handle = async (hash: string) => {
      const encoded = readShareHash(hash)
      if (!encoded) return
      const packet = await decodePacket(encoded)
      if (packet) cb.current.onPacket(packet)
      else cb.current.onInvalid()
    }

    const fromLocation = () => {
      const hash = window.location.hash
      if (!readShareHash(hash)) return
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
      handle(hash)
    }

    fromLocation()
    window.addEventListener('hashchange', fromLocation)

    let remove: (() => void) | undefined
    if (Capacitor.isNativePlatform()) {
      const listener = App.addListener('appUrlOpen', ({ url }) => {
        const at = url.indexOf('#')
        if (at >= 0) handle(url.slice(at))
      })
      remove = () => {
        listener.then((l) => l.remove())
      }
    }

    return () => {
      window.removeEventListener('hashchange', fromLocation)
      remove?.()
    }
  }, [])
}
