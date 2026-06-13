export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Notion Clone</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            페이지를 관리하고 기록하세요
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
