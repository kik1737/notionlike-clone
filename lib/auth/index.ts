import { createClient } from '@/lib/supabase/server'
import type { SessionUser } from './types'

export type { SessionUser } from './types'

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user?.email) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
  }
}

export async function requireSessionUser(): Promise<SessionUser> {
  const session = await getSessionUser()
  if (!session) {
    throw new Error('로그인이 필요합니다.')
  }
  return session
}
