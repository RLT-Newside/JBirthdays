// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { useMemo } from 'react'
import { useAppData } from '../../context/app-data'
import { sortUpcoming } from '../../utils/birthday'
import { UpcomingView } from './upcoming.view'

export function UpcomingContainer() {
  const { people, tags, gifts, setViewingId, setEditingId, setTab, notificationStatus } = useAppData()
  const upcoming = useMemo(() => sortUpcoming(people, new Date()), [people])
  const openIdeas = useMemo(() => {
    const counts = new Map<string, number>()
    for (const g of gifts) if (g.givenYear === undefined) counts.set(g.personId, (counts.get(g.personId) ?? 0) + 1)
    return counts
  }, [gifts])

  return (
    <UpcomingView
      upcoming={upcoming}
      tags={tags}
      openIdeas={openIdeas}
      remindersOff={notificationStatus === 'denied'}
      onOpen={setViewingId}
      onAdd={() => setEditingId('new')}
      onGoShare={() => setTab('share')}
      onGoSettings={() => setTab('settings')}
    />
  )
}
