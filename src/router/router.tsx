// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
import { useAppData } from '../context/app-data'
import { PeopleContainer } from '../pages/people/people.container'
import { SettingsContainer } from '../pages/settings/settings.container'
import { ShareContainer } from '../pages/share/share.container'
import { UpcomingContainer } from '../pages/upcoming/upcoming.container'

export function AppRouter() {
  const { tab } = useAppData()
  switch (tab) {
    case 'upcoming':
      return <UpcomingContainer />
    case 'people':
      return <PeopleContainer />
    case 'share':
      return <ShareContainer />
    case 'settings':
      return <SettingsContainer />
  }
}
