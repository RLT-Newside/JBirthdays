// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { AppShell } from './app-shell'
import { ErrorBoundary } from './components/error-boundary/error-boundary'
import { AppDataProvider } from './context/app-data'
import { UpdateProvider } from './context/update'

export default function App() {
  return (
    <ErrorBoundary>
      <AppDataProvider>
        <UpdateProvider>
          <AppShell />
        </UpdateProvider>
      </AppDataProvider>
    </ErrorBoundary>
  )
}
