'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userEmail?: string
  workspaceName?: string
}

export function SettingsDialog({
  open,
  onOpenChange,
  userEmail,
  workspaceName = '내 워크스페이스',
}: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>설정</DialogTitle>
          <DialogDescription>
            워크스페이스와 계정 정보를 확인합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              워크스페이스
            </p>
            <p className="rounded-md border border-border bg-muted/30 px-3 py-2">
              {workspaceName}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              계정
            </p>
            <p className="rounded-md border border-border bg-muted/30 px-3 py-2">
              {userEmail ?? '로그인 정보 없음'}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            테마, 알림 등 추가 설정은 추후 업데이트 예정입니다.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
