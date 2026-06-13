import { NotionApp } from '@/components/notion/NotionApp'
import { getPagesFlat, getPagesTree } from '@/app/actions/pages'
import { getSessionUser } from '@/lib/auth'

export default async function HomePage() {
  const [pages, flatPages, session] = await Promise.all([
    getPagesTree(),
    getPagesFlat(),
    getSessionUser(),
  ])

  return (
    <NotionApp
      initialPages={pages}
      flatPages={flatPages}
      userEmail={session?.email}
    />
  )
}
