import { createBrowserRouter } from 'react-router'

import { Layout } from './components/Layout'
import { ComparePage } from './pages/ComparePage'
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
        { path: ':username/vs/:other', element: <ComparePage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: '/streakline' },
)
