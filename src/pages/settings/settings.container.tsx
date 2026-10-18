// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { useState } from 'react'
import { useAppData } from '../../context/app-data'
import { useTheme } from '../../hooks/useTheme'
import { createBackup } from '../../utils/backup'
import { exportJsonFile } from '../../utils/fileExport'
import { parseImportText, readFileText } from '../../utils/importSource'
import { SettingsView } from './settings.view'

export function SettingsContainer() {
  const { setPendingBackup, setPendingImport } = useAppData()
  const { theme, setTheme } = useTheme()
  const [backupError, setBackupError] = useState<string>()

  const exportBackup = () => {
    const date = new Date().toISOString().slice(0, 10)
    exportJsonFile(createBackup(), `jbirthdays-backup-${date}.json`, 'JBirthdays backup').catch(() =>
      setBackupError('Export failed'),
    )
  }

  const importBackup = async (file: File) => {
    setBackupError(undefined)
    try {
      const src = await parseImportText(await readFileText(file))
      if (src?.kind === 'backup') setPendingBackup(src.backup)
      else if (src?.kind === 'packet') setPendingImport(src)
      else setBackupError('Not a JBirthdays backup file')
    } catch {
      setBackupError('Could not read file')
    }
  }

  return (
    <SettingsView
      theme={theme}
      onTheme={setTheme}
      onExportBackup={exportBackup}
      onImportBackup={importBackup}
      backupError={backupError}
    />
  )
}
