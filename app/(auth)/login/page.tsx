import { LoginForm } from '@/components/auth/LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="flex flex-col items-center">
      <h2 className="mb-6 text-lg font-semibold text-foreground">로그인</h2>
      {error && (
        <p className="mb-4 text-sm text-destructive" role="alert">
          로그인에 실패했습니다. 다시 시도해 주세요.
        </p>
      )}
      <LoginForm />
    </div>
  )
}
