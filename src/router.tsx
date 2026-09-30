import { createBrowserRouter } from 'react-router'

import { Layout } from './components/Layout'
import { LandingPage } from './pages/LandingPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ProfilePage } from './pages/ProfilePage'

export const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { index: true, element: <LandingPage /> },
        { path: ':username', element: <ProfilePage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: '/streakline' },
)
