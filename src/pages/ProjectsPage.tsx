import { FolderGit2 } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useParams } from 'react-router'

import { ProfileError } from '../components/profile/ProfileStates'
import { ProjectCard } from '../components/projects/ProjectCard'
import { plural } from '../lib/format'
import { useOwnerProjects } from '../lib/useOwnerProjects'

export function ProjectsPage() {
  const { username = '' } = useParams()
  const { state, retry } = useOwnerProjects(username)
  const data = state.status === 'ready' ? state.data : null

  useEffect(() => {
    document.title = `${data?.owner.name ?? data?.owner.login ?? username} projects · Streakline`
    return () => {
      document.title = 'Streakline'
    }
  }, [data, username])

  return (
    <div className="mx-auto max-w-[1440px] px-margin-mobile py-space-lg md:px-margin md:py-space-xl">
      {state.status === 'error' ? (
        <div className="mx-auto max-w-xl py-space-xl">
          <ProfileError code={state.error.code} login={username} onRetry={retry} />
        </div>
      ) : data ? (
        <>
          <header className="mb-space-lg flex flex-wrap items-center gap-space-md">
            <img
              src={data.owner.avatarUrl}
              alt=""
              width={56}
              height={56}
              className="size-14 rounded-lg bg-surface-container"
            />
            <div className="min-w-0 flex-1">
              <h1 className="font-headline-md text-headline-md break-words">
                {data.owner.name ?? data.owner.login}
                <span className="ml-2 font-body-md text-body-md text-on-surface-variant">
                  @{data.owner.login}
                </span>
              </h1>
              {data.owner.description && (
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {data.owner.description}
                </p>
              )}
            </div>
            {data.owner.kind === 'user' && (
              <Link
                to={`/${data.owner.login}`}
                className="font-label-md text-label-md text-on-surface-variant hover:text-primary"
              >
                View activity →
              </Link>
            )}
          </header>

          {data.repos.length === 0 ? (
            <p className="py-space-xl text-center font-body-md text-body-md text-on-surface-variant">
              @{data.owner.login} has no public projects yet.
            </p>
          ) : (
            <>
              <h2 className="mb-space-md flex items-center gap-space-sm font-headline-sm text-headline-sm">
                <FolderGit2 className="size-5 text-primary" aria-hidden="true" />
                {plural(data.repoCount, 'public project')}
              </h2>
              <ul className="grid gap-gutter-mobile md:grid-cols-2 lg:grid-cols-3 lg:gap-gutter">
                {data.repos.map((repo) => (
                  <li key={repo.nameWithOwner}>
                    <ProjectCard repo={repo} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : (
        <p
          className="py-space-xl text-center font-body-md text-body-md text-on-surface-variant"
          role="status"
        >
          Loading projects…
        </p>
      )}
    </div>
  )
}
