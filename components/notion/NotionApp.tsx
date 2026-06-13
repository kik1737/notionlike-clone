'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { PageEditor } from './PageEditor'
import { SearchDialog } from './SearchDialog'
import { SettingsDialog } from './SettingsDialog'
import { HomeView, InboxView, type AppView } from './SidebarPanels'
import { cn } from '@/lib/utils'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import type { NotionPage } from '@/lib/types/page'
import {
  createPageAction,
  deletePageAction,
  duplicatePageAction,
  toggleFavoriteAction,
  updatePageAction,
} from '@/app/actions/pages'
import { flattenPageTree } from '@/lib/mappers/page-mapper'

function findPage(pages: NotionPage[], id: string): NotionPage | null {
  for (const page of pages) {
    if (page.id === id) return page
    if (page.children) {
      const found = findPage(page.children, id)
      if (found) return found
    }
  }
  return null
}

function getBreadcrumbs(
  pages: NotionPage[],
  targetId: string,
  path: NotionPage[] = []
): NotionPage[] | null {
  for (const page of pages) {
    if (page.id === targetId) return path
    if (page.children) {
      const found = getBreadcrumbs(page.children, targetId, [...path, page])
      if (found !== null) return found
    }
  }
  return null
}

function updatePageInTree(
  pages: NotionPage[],
  id: string,
  updater: (page: NotionPage) => NotionPage
): NotionPage[] {
  return pages.map((p) => {
    if (p.id === id) return updater(p)
    if (p.children) {
      return { ...p, children: updatePageInTree(p.children, id, updater) }
    }
    return p
  })
}

interface NotionAppProps {
  initialPages: NotionPage[]
  flatPages: NotionPage[]
  userEmail?: string
}

export function NotionApp({
  initialPages,
  flatPages: initialFlatPages,
  userEmail,
}: NotionAppProps) {
  const router = useRouter()
  const [pages, setPages] = useState<NotionPage[]>(initialPages)
  const [flatPages, setFlatPages] = useState<NotionPage[]>(initialFlatPages)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(() => {
    const flat = flattenPageTree(initialPages)
    return flat[0]?.id ?? null
  })
  const [activeView, setActiveView] = useState<AppView>('editor')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    setPages(initialPages)
    setFlatPages(initialFlatPages)
  }, [initialPages, initialFlatPages])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const selectedPage = selectedPageId ? findPage(pages, selectedPageId) : null
  const breadcrumbs = selectedPageId
    ? (getBreadcrumbs(pages, selectedPageId) ?? [])
    : []

  const favoritePages = useMemo(
    () => flatPages.filter((page) => page.isFavorite),
    [flatPages]
  )

  const recentPages = useMemo(() => flatPages.slice(0, 20), [flatPages])

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  const handleSelectPage = useCallback((id: string) => {
    setSelectedPageId(id)
    setActiveView('editor')
  }, [])

  const handleNavigateHome = useCallback(() => {
    setActiveView('home')
    setSelectedPageId(null)
  }, [])

  const handleNavigateInbox = useCallback(() => {
    setActiveView('inbox')
    setSelectedPageId(null)
  }, [])

  const handleAddPage = useCallback(
    async (parentId?: string) => {
      try {
        const result = await createPageAction(parentId)
        refresh()
        setSelectedPageId(result.id)
        setActiveView('editor')
      } catch (error) {
        console.error('Failed to create page:', error)
        alert(
          error instanceof Error
            ? error.message
            : '페이지 생성에 실패했습니다.'
        )
      }
    },
    [refresh]
  )

  const handleDeletePage = useCallback(
    async (id: string) => {
      await deletePageAction(id)
      setSelectedPageId((prev) => (prev === id ? null : prev))
      if (selectedPageId === id) {
        setActiveView('home')
      }
      refresh()
    },
    [refresh, selectedPageId]
  )

  const handleDuplicatePage = useCallback(
    async (id: string) => {
      const result = await duplicatePageAction(id)
      refresh()
      setSelectedPageId(result.id)
      setActiveView('editor')
    },
    [refresh]
  )

  const handleRenamePage = useCallback((id: string) => {
    setSelectedPageId(id)
    setActiveView('editor')
  }, [])

  const handleToggleExpand = useCallback(
    async (id: string) => {
      const page = findPage(pages, id)
      if (!page) return

      const nextExpanded = !page.isExpanded
      setPages((prev) =>
        updatePageInTree(prev, id, (p) => ({
          ...p,
          isExpanded: nextExpanded,
        }))
      )
      await updatePageAction(id, { isExpanded: nextExpanded })
    },
    [pages]
  )

  const applyFavoriteState = useCallback((id: string, isFavorite: boolean) => {
    setPages((prev) =>
      updatePageInTree(prev, id, (p) => ({
        ...p,
        isFavorite,
      }))
    )
    setFlatPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isFavorite } : p))
    )
  }, [])

  const handleToggleFavorite = useCallback(
    async (id: string) => {
      const current =
        flatPages.find((page) => page.id === id) ??
        findPage(pages, id) ??
        null
      const previous = Boolean(current?.isFavorite)
      const next = !previous

      applyFavoriteState(id, next)

      try {
        const result = await toggleFavoriteAction(id)
        applyFavoriteState(id, result.isFavorite)
      } catch {
        applyFavoriteState(id, previous)
        throw new Error('즐겨찾기 변경에 실패했습니다.')
      }
    },
    [applyFavoriteState, flatPages, pages]
  )

  const handleUpdateTitle = useCallback(
    async (id: string, title: string) => {
      setPages((prev) =>
        updatePageInTree(prev, id, (p) => ({ ...p, title }))
      )
      setFlatPages((prev) =>
        prev.map((p) => (p.id === id ? { ...p, title } : p))
      )
      await updatePageAction(id, { title })
    },
    []
  )

  const handleUpdateEmoji = useCallback(
    async (id: string, emoji: string) => {
      setPages((prev) =>
        updatePageInTree(prev, id, (p) => ({ ...p, emoji }))
      )
      setFlatPages((prev) =>
        prev.map((p) => (p.id === id ? { ...p, emoji } : p))
      )
      await updatePageAction(id, { emoji })
    },
    []
  )

  return (
    <div className="flex h-full overflow-hidden bg-background text-foreground">
      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        pages={flatPages}
        onSelectPage={handleSelectPage}
      />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        userEmail={userEmail}
      />

      {!sidebarOpen && (
        <button
          type="button"
          className="absolute left-2 top-12 z-50 flex size-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          onClick={() => setSidebarOpen(true)}
          aria-label="사이드바 열기"
        >
          <PanelLeftOpen className="size-4" />
        </button>
      )}

      <div
        className={cn(
          'relative flex-shrink-0 transition-all duration-200 ease-in-out',
          sidebarOpen ? 'w-60' : 'w-0 overflow-hidden'
        )}
      >
        {sidebarOpen && (
          <>
            <Sidebar
              pages={pages}
              favoritePages={favoritePages}
              selectedPageId={selectedPageId}
              activeView={activeView}
              onSelectPage={handleSelectPage}
              onAddPage={handleAddPage}
              onDeletePage={handleDeletePage}
              onDuplicatePage={handleDuplicatePage}
              onRenamePage={handleRenamePage}
              onToggleExpand={handleToggleExpand}
              onToggleFavorite={handleToggleFavorite}
              onOpenSearch={() => setSearchOpen(true)}
              onNavigateHome={handleNavigateHome}
              onNavigateInbox={handleNavigateInbox}
              onOpenSettings={() => setSettingsOpen(true)}
            />
            <button
              type="button"
              className="absolute right-2 top-3 flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              onClick={() => setSidebarOpen(false)}
              aria-label="사이드바 닫기"
            >
              <PanelLeftClose className="size-3.5" />
            </button>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {activeView === 'home' ? (
          <HomeView
            pages={recentPages}
            onSelectPage={handleSelectPage}
            onCreatePage={() => void handleAddPage()}
          />
        ) : activeView === 'inbox' ? (
          <InboxView
            recentPages={recentPages}
            onSelectPage={handleSelectPage}
          />
        ) : selectedPage ? (
          <PageEditor
            key={selectedPage.id}
            page={selectedPage}
            isFavorite={Boolean(selectedPage.isFavorite)}
            onUpdateTitle={handleUpdateTitle}
            onUpdateEmoji={handleUpdateEmoji}
            onToggleFavorite={handleToggleFavorite}
            onDuplicatePage={handleDuplicatePage}
            onDeletePage={handleDeletePage}
            breadcrumbs={breadcrumbs}
            onSelectPage={handleSelectPage}
          />
        ) : (
          <HomeView
            pages={recentPages}
            onSelectPage={handleSelectPage}
            onCreatePage={() => void handleAddPage()}
          />
        )}
      </div>
    </div>
  )
}
