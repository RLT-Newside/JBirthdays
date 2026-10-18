// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useAppUpdate } from '../../../../context/update'
import type { CheckResult } from '../../../../hooks/useUpdateCheck'

/** Version line plus, in the Android app, a manual "Check for updates". */
export function AppVersion() {
  const { available, update, checking, checkNow, setDialogOpen } = useAppUpdate()
  const [result, setResult] = useState<CheckResult | null>(null)

  const check = async () => {
    setResult(null)
    setResult(await checkNow())
  }

  return (
    <div className="text-center space-y-1.5">
      <p className="text-[11px] text-white/30">
        JBirthdays v{typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev'}
      </p>
      {available && (
        <>
          <button
            type="button"
            onClick={check}
            disabled={checking}
            className="inline-flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/60 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={11} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Checking…' : 'Check for updates'}
          </button>
          {update ? (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="block mx-auto text-[11px] text-brand hover:underline"
            >
              Update available: {update.version}
            </button>
          ) : (
            result === 'latest' && <p className="text-[11px] text-white/30">You're on the latest version.</p>
          )}
          {result === 'error' && <p className="text-[11px] text-red-400/70">Check failed. Try again later.</p>}
        </>
      )}
    </div>
  )
}
