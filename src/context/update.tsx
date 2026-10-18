// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { Capacitor } from '@capacitor/core'
import { createContext, type ReactNode, useContext, useState } from 'react'
import { type CheckResult, type UpdateInfo, useUpdateCheck } from '../hooks/useUpdateCheck'

interface UpdateContextValue {
  /** False on web/PWA — only the Android APK self-updates. */
  available: boolean
  update: UpdateInfo | null
  checking: boolean
  checkNow: () => Promise<CheckResult>
  dialogOpen: boolean
  setDialogOpen: (open: boolean) => void
}

const UpdateContext = createContext<UpdateContextValue | null>(null)

export function UpdateProvider({ children }: { children: ReactNode }) {
  const available = Capacitor.isNativePlatform()
  const { update, checkNow, checking } = useUpdateCheck(available)
  // Opens automatically once an update is found; "Not now" hides it until next launch.
  const [dialogOpen, setDialogOpen] = useState(true)

  return (
    <UpdateContext.Provider value={{ available, update, checking, checkNow, dialogOpen, setDialogOpen }}>
      {children}
    </UpdateContext.Provider>
  )
}

export function useAppUpdate(): UpdateContextValue {
  const ctx = useContext(UpdateContext)
  if (!ctx) throw new Error('useAppUpdate must be used inside UpdateProvider')
  return ctx
}
