'use client'

import { File, Home, Inbox } from 'lucide-react'
import type { NotionPage } from '@/lib/types/page'
import { cn } from '@/lib/utils'

type AppView = 'home' | 'inbox' | 'editor'

interface SidebarPanelsProps {
  view: AppView
  pages: NotionPage[]
  recentPages: NotionPage[]
  onSelectPage: (id: string) => void
  onCreatePage: () => void
}

function formatRelativeTime(iso?: string) {
  if (!iso) return ''
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '방금 전'
  if (diffMin < 60) return `${diffMin}분 전`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}시간 전`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay}일 전`
}

function PageListItem({
  page,
  onSelect,
  meta,
}: {
  page: NotionPage
  onSelect: (id: string) => void
  meta?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(page.id)}
      className="flex w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-left hover:bg-accent transition-colors"
    >
      <span className="text-lg leading-none">
        {page.emoji ?? <File className="size-4 text-muted-foreground" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {page.title || '제목 없음'}
        </span>
        {meta && (
          <span className="block text-xs text-muted-foreground">{meta}</span>
        )}
      </span>
    </button>
  )
}

export function HomeView({
  pages,
  onSelectPage,
  onCreatePage,
}: Omit<SidebarPanelsProps, 'view' | 'recentPages'>) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-border px-8 py-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Home className="size-4" />
          <h1 className="text-sm font-medium">홈</h1>
        </div>
        <p className="mt-4 text-2xl font-semibold text-foreground">
          워크스페이스에 오신 것을 환영합니다
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          최근 페이지를 열거나 새 페이지를 만들어 작업을 시작하세요.
        </p>
        <button
          type="button"
          onClick={onCreatePage}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          새 페이지 만들기
        </button>
      </div>
      <div className="px-8 py-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          최근 페이지
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {pages.length === 0 ? (
            <p className="text-sm text-muted-foreground">페이지가 없습니다.</p>
          ) : (
            pages.slice(0, 6).map((page) => (
              <PageListItem
                key={page.id}
                page={page}
                onSelect={onSelectPage}
                meta={formatRelativeTime(page.updatedAt)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function InboxView({
  recentPages,
  onSelectPage,
}: Pick<SidebarPanelsProps, 'recentPages' | 'onSelectPage'>) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-border px-8 py-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Inbox className="size-4" />
          <h1 className="text-sm font-medium">받은 편지함</h1>
        </div>
        <p className="mt-4 text-2xl font-semibold text-foreground">
          최근 업데이트된 페이지
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          최근에 수정한 페이지가 시간순으로 표시됩니다.
        </p>
      </div>
      <div className="space-y-2 px-8 py-6">
        {recentPages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 업데이트된 페이지가 없습니다.
          </p>
        ) : (
          recentPages.map((page) => (
            <PageListItem
              key={page.id}
              page={page}
              onSelect={onSelectPage}
              meta={formatRelativeTime(page.updatedAt)}
            />
          ))
        )}
      </div>
    </div>
  )
}

export type { AppView }

export function getNavButtonClass(active: boolean) {
  return cn(
    'flex w-full items-center gap-2 rounded-sm px-2 py-[5px] text-[13.5px] transition-colors',
    active
      ? 'bg-accent text-foreground font-medium'
      : 'text-foreground/75 hover:bg-accent hover:text-foreground'
  )
}
