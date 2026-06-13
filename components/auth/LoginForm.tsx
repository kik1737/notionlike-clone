'use client'

import { signInWithGoogleAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

export function LoginForm() {
  return (
    <form action={signInWithGoogleAction} className="flex w-full max-w-sm flex-col gap-4">
      <Button type="submit" className="w-full">
        Google로 로그인
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Google 계정으로 로그인하면 서비스를 이용할 수 있습니다.
      </p>
    </form>
  )
}
