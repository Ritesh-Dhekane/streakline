import { createBrowserRouter } from 'react-router'

import { Layout } from './components/Layout'
import { ComparePage } from './pages/ComparePage'
import { LandingPage } from './pages/LandingPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { ProfilePage } from './pages/ProfilePage'
import { ReviewPage } from './pages/ReviewPage'

export const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { index: true, element: <LandingPage /> },
        { path: 'privacy', element: <PrivacyPage /> },
        { path: ':username', element: <ProfilePage /> },
        { path: ':username/vs/:other', element: <ComparePage /> },
        { path: ':username/review/:year', element: <ReviewPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: '/streakline' },
)
