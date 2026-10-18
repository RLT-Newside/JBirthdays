// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { useCallback, useState } from 'react'
import { BackupImportDialog } from './components/backup-import-dialog/backup-import-dialog'
import { ErrorBoundary } from './components/error-boundary/error-boundary'
import { ImportDialog } from './components/import-dialog/import-dialog'
import { PersonDetailModal } from './components/person-detail-modal/person-detail-modal'
import { PersonFormModal } from './components/person-form-modal/person-form-modal'
import { useAppData } from './context/app-data'
import { useBackButton } from './hooks/useBackButton'
import { useKeyboardVisible } from './hooks/useKeyboardVisible'
import { useLinkImport } from './hooks/useLinkImport'
import { useSharedImport } from './hooks/useSharedImport'
import { useTheme } from './hooks/useTheme'
import { BottomNav } from './layout/bottom-nav/bottom-nav'
import { Header } from './layout/header/header'
import { AppRouter } from './router/router'
import { parseImportText } from './utils/importSource'

export function AppShell() {
  const { tab, setTab, pendingImport, setPendingImport, pendingBackup, setPendingBackup } = useAppData()
  const keyboardVisible = useKeyboardVisible()
  const [toast, setToast] = useState<string>()
  useTheme()

  const flash = useCallback((text: string) => {
    setToast(text)
    setTimeout(() => setToast(undefined), 3000)
  }, [])

  useLinkImport(setPendingImport, () => flash('That share link is broken or incomplete'))

  // Shared to the app on Android: a .jbday.json file, a share link as text, or a full backup.
  const onShared = useCallback(
    async (text: string) => {
      const src = await parseImportText(text)
      if (src?.kind === 'packet') setPendingImport(src.packet)
      else if (src?.kind === 'backup') setPendingBackup(src.backup)
      else flash("That file isn't a JBirthdays share")
    },
    [setPendingImport, setPendingBackup, flash],
  )
  useSharedImport(onShared)

  // Hardware back: leave sub-tabs before exiting the app.
  useBackButton([
    () => {
      if (tab === 'upcoming') return false
      setTab('upcoming')
      return true
    },
  ])

  return (
    <div className="min-h-screen max-w-lg mx-auto flex flex-col">
      <Header />
      <main className="flex-1 px-4 pt-4 pb-24">
        <ErrorBoundary>
          <AppRouter />
        </ErrorBoundary>
      </main>
      <BottomNav active={tab} onChange={setTab} hidden={keyboardVisible} />

      <PersonDetailModal />
      <PersonFormModal />
      <ImportDialog
        packet={pendingImport}
        onClose={() => setPendingImport(null)}
        onImported={(n) => {
          setPendingImport(null)
          setTab('upcoming')
          flash(n > 0 ? `Imported ${n} ${n === 1 ? 'birthday' : 'birthdays'} 🎉` : 'Existing entries updated')
        }}
      />
      <BackupImportDialog backup={pendingBackup} onClose={() => setPendingBackup(null)} />

      {toast && (
        <div
          role="status"
          className="fixed above-nav left-1/2 -translate-x-1/2 mb-4 z-[60] px-4 py-2 rounded-xl text-sm bg-brand text-black font-medium animate-fade-in"
        >
          {toast}
        </div>
      )}
    </div>
  )
}
