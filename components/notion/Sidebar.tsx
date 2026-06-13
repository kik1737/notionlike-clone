'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  ChevronRight,
  File,
  FilePlus,
  FolderPlus,
  Hash,
  Home,
  Inbox,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Star,
  Trash2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import type { NotionPage } from '@/lib/types/page'
import { getNavButtonClass, type AppView } from './SidebarPanels'

interface SidebarProps {
  pages: NotionPage[]
  favoritePages: NotionPage[]
  selectedPageId: string | null
  activeView: AppView
  onSelectPage: (id: string) => void
  onAddPage: (parentId?: string) => void
  onDeletePage: (id: string) => void
  onDuplicatePage: (id: string) => void
  onRenamePage: (id: string) => void
  onToggleExpand: (id: string) => void
  onToggleFavorite?: (id: string) => void
  onOpenSearch: () => void
  onNavigateHome: () => void
  onNavigateInbox: () => void
  onOpenSettings: () => void
  workspaceName?: string
}

function FavoriteItem({
  page,
  selectedPageId,
  onSelectPage,
}: {
  page: NotionPage
  selectedPageId: string | null
  onSelectPage: (id: string) => void
}) {
  const isSelected = selectedPageId === page.id

  return (
    <button
      type="button"
      onClick={() => onSelectPage(page.id)}
      className={cn(
        'flex w-full items-center gap-2 rounded-sm px-2 py-[5px] text-[13.5px] transition-colors',
        isSelected
          ? 'bg-accent text-foreground font-medium'
          : 'text-foreground/75 hover:bg-accent hover:text-foreground'
      )}
    >
      <span className="flex size-5 items-center justify-center text-base leading-none">
        {page.emoji ?? <File className="size-[14px] text-muted-foreground" />}
      </span>
      <span className="truncate">{page.title || '제목 없음'}</span>
    </button>
  )
}

function PageItem({
  page,
  depth = 0,
  selectedPageId,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onDuplicatePage,
  onRenamePage,
  onToggleExpand,
  onToggleFavorite,
}: {
  page: NotionPage
  depth?: number
  selectedPageId: string | null
  onSelectPage: (id: string) => void
  onAddPage: (parentId?: string) => void
  onDeletePage: (id: string) => void
  onDuplicatePage: (id: string) => void
  onRenamePage: (id: string) => void
  onToggleExpand: (id: string) => void
  onToggleFavorite?: (id: string) => void
}) {
  const [isHovered, setIsHovered] = useState(false)
  const isSelected = selectedPageId === page.id
  const hasChildren = page.children && page.children.length > 0

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        className={cn(
          'group relative flex items-center gap-1 rounded-sm py-[3px] text-sm cursor-pointer select-none',
          'hover:bg-accent transition-colors duration-75',
          isSelected && 'bg-accent'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px`, paddingRight: '6px' }}
        onClick={() => onSelectPage(page.id)}
        onKeyDown={(e) => e.key === 'Enter' && onSelectPage(page.id)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span
          role="button"
          tabIndex={-1}
          className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-border hover:text-foreground transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand(page.id)
          }}
          aria-label={page.isExpanded ? '접기' : '펼치기'}
        >
          {hasChildren ? (
            page.isExpanded ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )
          ) : (
            <ChevronRight className="size-3 opacity-0" />
          )}
        </span>

        <span className="flex size-5 shrink-0 items-center justify-center text-base leading-none">
          {page.emoji ?? <File className="size-[14px] text-muted-foreground" />}
        </span>

        <span className="flex-1 truncate text-foreground/85 font-medium text-[13.5px]">
          {page.title || '제목 없음'}
        </span>

        <div
          className={cn(
            'flex items-center gap-0.5 transition-opacity',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <span
            role="button"
            tabIndex={-1}
            title="하위 페이지 추가"
            className="flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-border hover:text-foreground transition-colors"
            onClick={() => onAddPage(page.id)}
            aria-label="하위 페이지 추가"
          >
            <Plus className="size-3" />
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger
              nativeButton={false}
              render={
                <span
                  role="button"
                  tabIndex={-1}
                  title="더 보기"
                  className="flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-border hover:text-foreground transition-colors cursor-pointer"
                  aria-label="더 보기"
                />
              }
            >
              <MoreHorizontal className="size-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 text-sm">
              <DropdownMenuItem onClick={() => onToggleFavorite?.(page.id)}>
                <Star className="size-4 text-muted-foreground" />
                {page.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDeletePage(page.id)}>
                <Trash2 className="size-4 text-muted-foreground" />
                삭제
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicatePage(page.id)}>
                <FilePlus className="size-4 text-muted-foreground" />
                복제
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRenamePage(page.id)}>
                <Hash className="size-4 text-muted-foreground" />
                이름 변경
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {page.isExpanded && hasChildren && (
        <div>
          {page.children!.map((child) => (
            <PageItem
              key={child.id}
              page={child}
              depth={depth + 1}
              selectedPageId={selectedPageId}
              onSelectPage={onSelectPage}
              onAddPage={onAddPage}
              onDeletePage={onDeletePage}
              onDuplicatePage={onDuplicatePage}
              onRenamePage={onRenamePage}
              onToggleExpand={onToggleExpand}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar({
  pages,
  favoritePages,
  selectedPageId,
  activeView,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onDuplicatePage,
  onRenamePage,
  onToggleExpand,
  onToggleFavorite,
  onOpenSearch,
  onNavigateHome,
  onNavigateInbox,
  onOpenSettings,
  workspaceName = '내 워크스페이스',
}: SidebarProps) {
  const quickActions: Array<{
    icon: typeof Search
    label: string
    onClick: () => void
    shortcut?: string
    active?: boolean
  }> = [
    { icon: Search, label: '검색', shortcut: '⌘K', onClick: onOpenSearch },
    { icon: Home, label: '홈', onClick: onNavigateHome, active: activeView === 'home' },
    {
      icon: Inbox,
      label: '받은 편지함',
      onClick: onNavigateInbox,
      active: activeView === 'inbox',
    },
    { icon: Settings, label: '설정', onClick: onOpenSettings },
  ]

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border select-none">
      <div className="flex h-11 items-center px-3">
        <button
          type="button"
          onClick={onNavigateHome}
          className="flex flex-1 items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-semibold hover:bg-sidebar-accent transition-colors"
        >
          <span className="flex size-5 items-center justify-center rounded-sm bg-foreground/10 text-foreground text-xs font-bold">
            {workspaceName.charAt(0).toUpperCase()}
          </span>
          <span className="truncate text-[13.5px] text-foreground/90">{workspaceName}</span>
          <ChevronDown className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </div>

      <div className="px-2 pb-1">
        {quickActions.map(({ icon: Icon, label, shortcut, onClick, active = false }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className={getNavButtonClass(active)}
          >
            <Icon className="size-[15px] shrink-0 text-muted-foreground" />
            <span className="flex-1 text-left font-medium">{label}</span>
            {shortcut && (
              <span className="text-[11px] text-muted-foreground">{shortcut}</span>
            )}
          </button>
        ))}
      </div>

      <Separator className="my-1 bg-sidebar-border" />

      <div className="px-2 pb-1">
        <div className="flex items-center gap-1 px-2 py-[3px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Star className="size-3" />
          즐겨찾기
        </div>
        {favoritePages.length === 0 ? (
          <p className="px-3 py-1 text-[12px] text-muted-foreground italic">
            즐겨찾기한 페이지가 없습니다.
          </p>
        ) : (
          <div className="space-y-0.5">
            {favoritePages.map((page) => (
              <FavoriteItem
                key={page.id}
                page={page}
                selectedPageId={selectedPageId}
                onSelectPage={onSelectPage}
              />
            ))}
          </div>
        )}
      </div>

      <Separator className="my-1 bg-sidebar-border" />

      <div className="flex flex-col flex-1 overflow-hidden px-2">
        <div className="flex items-center px-2 py-[3px]">
          <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            페이지
          </span>
          <button
            type="button"
            title="새 페이지 추가"
            className="flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
            onClick={() => onAddPage()}
            aria-label="새 페이지 추가"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1">
          {pages.length === 0 ? (
            <p className="px-3 py-2 text-[12px] text-muted-foreground italic">
              페이지가 없습니다. 새 페이지를 추가해보세요.
            </p>
          ) : (
            pages.map((page) => (
              <PageItem
                key={page.id}
                page={page}
                selectedPageId={selectedPageId}
                onSelectPage={onSelectPage}
                onAddPage={onAddPage}
                onDeletePage={onDeletePage}
                onDuplicatePage={onDuplicatePage}
                onRenamePage={onRenamePage}
                onToggleExpand={onToggleExpand}
                onToggleFavorite={onToggleFavorite}
              />
            ))
          )}
        </div>

        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-sm px-2 py-[5px] text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors mt-1 mb-2"
          onClick={() => onAddPage()}
        >
          <Plus className="size-[15px] shrink-0" />
          <span>새 페이지</span>
        </button>
      </div>

      <Separator className="bg-sidebar-border" />

      <div className="px-2 py-2">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-sm px-2 py-[5px] text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Trash2 className="size-[15px] shrink-0" />
          <span>휴지통</span>
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-sm px-2 py-[5px] text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <FolderPlus className="size-[15px] shrink-0" />
          <span>템플릿</span>
        </button>
      </div>
    </aside>
  )
}
