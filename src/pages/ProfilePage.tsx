import { useParams } from 'react-router'

export function ProfilePage() {
  const { username = '' } = useParams()
  return (
    <section className="mx-auto max-w-[1440px] px-margin-mobile py-space-xl md:px-margin">
      <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg">@{username}</h1>
    </section>
  )
}
