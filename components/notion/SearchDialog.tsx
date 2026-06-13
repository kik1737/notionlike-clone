'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { File, Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { NotionPage } from '@/lib/types/page'
import { cn } from '@/lib/utils'

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pages: NotionPage[]
  onSelectPage: (id: string) => void
}

export function SearchDialog({
  open,
  onOpenChange,
  pages,
  onSelectPage,
}: SearchDialogProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return pages.slice(0, 8)
    return pages.filter((page) =>
      (page.title || '제목 없음').toLowerCase().includes(normalized)
    )
  }, [pages, query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const handleSelect = (id: string) => {
    onSelectPage(id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="sr-only">페이지 검색</DialogTitle>
          <div className="flex items-center gap-2">
            <Search className="size-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="페이지 검색..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              ESC
            </span>
          </div>
        </DialogHeader>
        <div className="max-h-72 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              검색 결과가 없습니다.
            </p>
          ) : (
            results.map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() => handleSelect(page.id)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
              >
                <span className="flex size-5 items-center justify-center text-base">
                  {page.emoji ?? <File className="size-3.5 text-muted-foreground" />}
                </span>
                <span className="truncate font-medium">
                  {page.title || '제목 없음'}
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
