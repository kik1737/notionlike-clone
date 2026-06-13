import { getSessionUser } from '@/lib/auth'
import { signOutAction } from '@/app/actions/auth'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSessionUser()

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-10 shrink-0 items-center justify-end gap-3 border-b border-border px-4 text-sm text-muted-foreground">
        <span>{session?.email}</span>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-sm px-2 py-1 text-foreground hover:bg-accent transition-colors"
          >
            로그아웃
          </button>
        </form>
      </header>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
