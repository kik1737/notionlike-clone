'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Bold,
  ChevronRight,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListOrdered,
  MoreHorizontal,
  Quote,
  Share,
  Star,
  Strikethrough,
  Type,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { NotionPage, BlockType } from '@/lib/types/page'
import { getBlocksAction, saveBlocksAction } from '@/app/actions/blocks'
import {
  applyRichTextFormat,
  blocksToMarkdown,
  getPlainTextFromHtml,
  isEmptyBlockContent,
  normalizeBlockContent,
  plainTextToHtml,
  sanitizeBlockHtml,
  type InlineFormat,
} from '@/lib/utils/text-format'

interface Block {
  id: string
  type: BlockType
  content: string
}

interface PageEditorProps {
  page: NotionPage
  isFavorite?: boolean
  onUpdateTitle: (id: string, title: string) => void | Promise<void>
  onUpdateEmoji: (id: string, emoji: string) => void | Promise<void>
  onToggleFavorite?: (id: string) => void | Promise<void>
  onDuplicatePage?: (id: string) => void | Promise<void>
  onDeletePage?: (id: string) => void | Promise<void>
  breadcrumbs?: NotionPage[]
  onSelectPage?: (id: string) => void
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const EMOJIS = ['📝', '📄', '📋', '📌', '🗒️', '📓', '📔', '📕', '📗', '📘', '📙', '🗂️', '🗃️', '💡', '🔖', '✅', '🎯', '🚀', '⭐', '💎']

const BLOCK_PLACEHOLDERS: Record<BlockType, string> = {
  text: "'/'를 입력하여 명령어를 사용하거나 자유롭게 입력하세요...",
  heading1: '제목 1',
  heading2: '제목 2',
  heading3: '제목 3',
  bulletList: '목록 항목',
  numberedList: '목록 항목',
  quote: '인용구',
  code: '코드를 입력하세요...',
  divider: '',
}

const SLASH_MENU_WIDTH = 288
const SLASH_MENU_MAX_HEIGHT = 320
const SLASH_MENU_ITEM_HEIGHT = 48
const SLASH_MENU_HEADER_HEIGHT = 40

function computeSlashMenuPosition(rect: DOMRect, menuHeight: number) {
  let top = rect.bottom + 4
  let left = rect.left

  if (top + menuHeight > window.innerHeight - 8) {
    top = rect.top - menuHeight - 4
  }
  if (top < 8) {
    top = Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - menuHeight - 8))
  }

  if (left + SLASH_MENU_WIDTH > window.innerWidth - 8) {
    left = window.innerWidth - SLASH_MENU_WIDTH - 8
  }
  if (left < 8) left = 8

  return { top, left }
}

const SLASH_COMMANDS = [
  { type: 'heading1' as BlockType, icon: Heading1, label: '제목 1', description: '대형 섹션 제목' },
  { type: 'heading2' as BlockType, icon: Heading2, label: '제목 2', description: '중간 섹션 제목' },
  { type: 'heading3' as BlockType, icon: Heading3, label: '제목 3', description: '소형 섹션 제목' },
  { type: 'text' as BlockType, icon: Type, label: '텍스트', description: '일반 텍스트' },
  { type: 'bulletList' as BlockType, icon: List, label: '글머리 기호 목록', description: '글머리 기호 목록 생성' },
  { type: 'numberedList' as BlockType, icon: ListOrdered, label: '번호 목록', description: '번호가 매겨진 목록 생성' },
  { type: 'quote' as BlockType, icon: Quote, label: '인용구', description: '인용문 캡처' },
  { type: 'code' as BlockType, icon: Code2, label: '코드', description: '코드 스니펫 작성' },
  { type: 'divider' as BlockType, icon: MoreHorizontal, label: '구분선', description: '섹션 구분용 가로선' },
]

const RICH_TEXT_INLINE_STYLES =
  '[&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic [&_s]:line-through [&_strike]:line-through [&_del]:line-through [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_a]:underline [&_a]:underline-offset-2'

function RichTextBlockEditor({
  block,
  onUpdate,
  onKeyDown,
  onFocus,
  setEditorRef,
  isFocused,
}: {
  block: Block
  onUpdate: (content: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onFocus: () => void
  setEditorRef: (el: HTMLDivElement | null) => void
  isFocused: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const initializedRef = useRef(false)
  const editorElRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef(block.content)
  contentRef.current = block.content

  const blockStyles: Record<BlockType, string> = {
    text: 'text-[15px] leading-7 text-foreground',
    heading1: 'text-[1.875rem] font-bold leading-tight text-foreground mt-6 mb-1',
    heading2: 'text-[1.5rem] font-semibold leading-tight text-foreground mt-5 mb-1',
    heading3: 'text-[1.25rem] font-semibold leading-tight text-foreground mt-4 mb-1',
    bulletList: 'text-[15px] leading-7 text-foreground',
    numberedList: 'text-[15px] leading-7 text-foreground',
    quote: 'text-[15px] leading-7 text-muted-foreground border-l-[3px] border-foreground/30 pl-4 italic',
    code: 'text-[13px] leading-6 font-mono text-foreground bg-muted rounded-md px-3 py-2',
    divider: '',
  }

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      editorElRef.current = el
      setEditorRef(el)
      if (el && !initializedRef.current) {
        el.innerHTML = normalizeBlockContent(contentRef.current)
        initializedRef.current = true
      }
    },
    [setEditorRef]
  )

  useEffect(() => {
    initializedRef.current = false
    editorElRef.current = null
  }, [block.id])

  useEffect(() => {
    const el = editorElRef.current
    if (!el || !initializedRef.current) return

    const expectedHtml = normalizeBlockContent(block.content)
    const currentPlain = getPlainTextFromHtml(el.innerHTML)
    const expectedPlain = getPlainTextFromHtml(expectedHtml)

    if (currentPlain !== expectedPlain) {
      el.innerHTML = expectedHtml
    }
  }, [block.content, block.type])

  const isEmpty = isEmptyBlockContent(block.content)

  return (
    <div
      className="group relative flex items-start gap-1"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        className={cn(
          'mt-1 flex size-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/40 hover:bg-accent hover:text-muted-foreground transition-all',
          hovered ? 'opacity-100' : 'opacity-0'
        )}
        aria-label="드래그"
        type="button"
      >
        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
          <circle cx="2" cy="2" r="1.5" />
          <circle cx="8" cy="2" r="1.5" />
          <circle cx="2" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="2" cy="14" r="1.5" />
          <circle cx="8" cy="14" r="1.5" />
        </svg>
      </button>

      {block.type === 'bulletList' && (
        <span className="mt-[7px] size-[5px] shrink-0 rounded-full bg-foreground/70" />
      )}

      <div className="relative flex-1 min-w-0">
        {isFocused && isEmpty && (
          <span className="pointer-events-none absolute left-0 top-0 text-muted-foreground/40">
            {BLOCK_PLACEHOLDERS[block.type]}
          </span>
        )}
        <div
          ref={setRef}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => onUpdate(sanitizeBlockHtml(e.currentTarget.innerHTML))}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          className={cn(
            'w-full bg-transparent outline-none',
            blockStyles[block.type],
            RICH_TEXT_INLINE_STYLES
          )}
          aria-label="블록 내용"
          role="textbox"
        />
      </div>
    </div>
  )
}

function CodeBlockEditor({
  block,
  onUpdate,
  onKeyDown,
  onFocus,
  setEditorRef,
  isFocused,
}: {
  block: Block
  onUpdate: (content: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onFocus: () => void
  setEditorRef: (el: HTMLTextAreaElement | null) => void
  isFocused: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="group relative flex items-start gap-1"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        className={cn(
          'mt-1 flex size-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/40 hover:bg-accent hover:text-muted-foreground transition-all',
          hovered ? 'opacity-100' : 'opacity-0'
        )}
        aria-label="드래그"
        type="button"
      >
        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
          <circle cx="2" cy="2" r="1.5" />
          <circle cx="8" cy="2" r="1.5" />
          <circle cx="2" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="2" cy="14" r="1.5" />
          <circle cx="8" cy="14" r="1.5" />
        </svg>
      </button>

      <div className="flex-1 min-w-0">
        <textarea
          ref={setEditorRef}
          value={block.content}
          onChange={(e) => {
            onUpdate(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${e.target.scrollHeight}px`
          }}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          placeholder={isFocused ? BLOCK_PLACEHOLDERS.code : ''}
          rows={1}
          className="w-full resize-none overflow-hidden bg-transparent text-[13px] leading-6 font-mono text-foreground bg-muted rounded-md px-3 py-2 outline-none placeholder:text-muted-foreground/40"
          style={{ height: 'auto' }}
          aria-label="블록 내용"
        />
      </div>
    </div>
  )
}

function BlockComponent({
  block,
  onUpdate,
  onKeyDown,
  onFocus,
  setEditorRef,
  isFocused,
}: {
  block: Block
  onUpdate: (content: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onFocus: () => void
  setEditorRef: (el: HTMLElement | null) => void
  isFocused: boolean
}) {
  if (block.type === 'divider') {
    return (
      <div className="my-4 flex items-center gap-2">
        <div className="flex-1 border-t border-border" />
      </div>
    )
  }

  if (block.type === 'code') {
    return (
      <CodeBlockEditor
        block={block}
        onUpdate={onUpdate}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        setEditorRef={setEditorRef as (el: HTMLTextAreaElement | null) => void}
        isFocused={isFocused}
      />
    )
  }

  return (
    <RichTextBlockEditor
      block={block}
      onUpdate={onUpdate}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      setEditorRef={setEditorRef as (el: HTMLDivElement | null) => void}
      isFocused={isFocused}
    />
  )
}

function createEmptyBlock(): Block {
  return { id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`, type: 'text', content: '' }
}

function ToolbarIconButton({
  label,
  onClick,
  children,
  active = false,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        'flex size-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
        active && 'bg-accent text-foreground'
      )}
      aria-label={label}
    >
      {children}
    </button>
  )
}

export function PageEditor({
  page,
  isFavorite = false,
  onUpdateTitle,
  onUpdateEmoji,
  onToggleFavorite,
  onDuplicatePage,
  onDeletePage,
  breadcrumbs = [],
  onSelectPage,
}: PageEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashMenuQuery, setSlashMenuQuery] = useState('')
  const [slashMenuPos, setSlashMenuPos] = useState({ top: 0, left: 0 })
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [loading, setLoading] = useState(true)
  const [localTitle, setLocalTitle] = useState(page.title)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const editorRefs = useRef<Record<string, HTMLElement | null>>({})
  const blocksRef = useRef(blocks)
  const titleRef = useRef(page.title)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slashMenuActiveRef = useRef(false)

  useEffect(() => {
    blocksRef.current = blocks
  }, [blocks])

  useEffect(() => {
    titleRef.current = page.title
  }, [page.title])

  useEffect(() => {
    setLocalTitle(page.title)
  }, [page.title, page.id])

  const showToast = useCallback((message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 2000)
  }, [])

  const getFocusedEditor = useCallback(() => {
    if (!focusedBlockId) return null
    return editorRefs.current[focusedBlockId] ?? null
  }, [focusedBlockId])

  const setBlockEditorRef = useCallback((id: string, el: HTMLElement | null) => {
    editorRefs.current[id] = el
  }, [])

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}${window.location.pathname}?page=${page.id}`
    try {
      await navigator.clipboard.writeText(url)
      showToast('페이지 링크가 복사되었습니다.')
    } catch {
      showToast('링크 복사에 실패했습니다.')
    }
  }, [page.id, showToast])

  const handleExport = useCallback(async () => {
    const markdown = blocksToMarkdown(localTitle, blocksRef.current)
    try {
      await navigator.clipboard.writeText(markdown)
      showToast('마크다운이 클립보드에 복사되었습니다.')
    } catch {
      showToast('보내기에 실패했습니다.')
    }
  }, [localTitle, showToast])

  const getOrCreateRef = (id: string) => {
    return (el: HTMLElement | null) => setBlockEditorRef(id, el)
  }

  const persistBlocks = useCallback(async (blocksToSave: Block[]) => {
    setSaveStatus('saving')
    try {
      const saved = await saveBlocksAction(
        page.id,
        blocksToSave.map((block, index) => ({
          id: block.id.startsWith('temp-') ? undefined : block.id,
          type: block.type,
          content: block.content,
          sortOrder: index,
        }))
      )
      setBlocks((prev) => {
        let changed = false
        const next = prev.map((block, index) => {
          const savedBlock = saved[index]
          if (!savedBlock) return block

          const content = normalizeBlockContent(savedBlock.content)
          if (
            block.id === savedBlock.id &&
            block.type === savedBlock.type &&
            block.content === content
          ) {
            return block
          }

          changed = true
          return {
            id: savedBlock.id,
            type: savedBlock.type,
            content,
          }
        })

        return changed ? next : prev
      })
      setFocusedBlockId((prev) => {
        if (!prev?.startsWith('temp-')) return prev
        const index = blocksToSave.findIndex((block) => block.id === prev)
        if (index < 0) return prev
        return saved[index]?.id ?? prev
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    }
  }, [page.id])

  const scheduleBlockSave = useCallback(() => {
    if (slashMenuActiveRef.current) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      persistBlocks(blocksRef.current)
    }, 500)
  }, [persistBlocks])

  const updateSlashMenuPosition = useCallback((blockId: string, commandCount: number) => {
    const ref = editorRefs.current[blockId]
    if (!ref) return

    const rect = ref.getBoundingClientRect()
    const menuHeight = Math.min(
      SLASH_MENU_HEADER_HEIGHT + commandCount * SLASH_MENU_ITEM_HEIGHT,
      SLASH_MENU_MAX_HEIGHT
    )
    setSlashMenuPos(computeSlashMenuPosition(rect, menuHeight))
  }, [])

  const closeSlashMenu = useCallback(() => {
    slashMenuActiveRef.current = false
    setShowSlashMenu(false)
    setSlashMenuQuery('')
  }, [])

  const scheduleTitleSave = useCallback(
    (title: string) => {
      if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current)
      titleTimeoutRef.current = setTimeout(() => {
        void onUpdateTitle(page.id, title)
      }, 500)
    },
    [onUpdateTitle, page.id]
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    getBlocksAction(page.id)
      .then((loaded) => {
        if (cancelled) return
        if (loaded.length === 0) {
          setBlocks([createEmptyBlock()])
        } else {
          setBlocks(
            loaded.map((block) => ({
              id: block.id,
              type: block.type,
              content: normalizeBlockContent(block.content),
            }))
          )
        }
      })
      .catch(() => {
        if (!cancelled) setBlocks([createEmptyBlock()])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        void persistBlocks(blocksRef.current)
      }
      if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current)
    }
  }, [page.id, persistBlocks])

  const addBlock = (afterId?: string, type: BlockType = 'text') => {
    const newBlock = { ...createEmptyBlock(), type }
    setBlocks((prev) => {
      if (!afterId) return [...prev, newBlock]
      const idx = prev.findIndex((b) => b.id === afterId)
      const next = [...prev]
      next.splice(idx + 1, 0, newBlock)
      return next
    })
    setFocusedBlockId(newBlock.id)
    setTimeout(() => editorRefs.current[newBlock.id]?.focus(), 0)
    scheduleBlockSave()
    return newBlock.id
  }

  const deleteBlock = (id: string) => {
    setBlocks((prev) => {
      if (prev.length === 1) return [{ ...createEmptyBlock() }]
      const idx = prev.findIndex((b) => b.id === id)
      const newBlocks = prev.filter((b) => b.id !== id)
      const focusIdx = Math.max(0, idx - 1)
      const prevId = newBlocks[focusIdx]?.id
      if (prevId) {
        setFocusedBlockId(prevId)
        setTimeout(() => editorRefs.current[prevId]?.focus(), 0)
      }
      return newBlocks
    })
    scheduleBlockSave()
  }

  const updateBlock = (id: string, content: string) => {
    const plainText = getPlainTextFromHtml(content)
    const slashIdx = plainText.lastIndexOf('/')
    const hasSlashCommand =
      slashIdx >= 0 && !plainText.slice(slashIdx + 1).includes(' ')

    if (hasSlashCommand) {
      const query = plainText.slice(slashIdx + 1)
      slashMenuActiveRef.current = true
      setSlashMenuQuery(query)
      setShowSlashMenu(true)
      requestAnimationFrame(() => {
        const commandCount = SLASH_COMMANDS.filter(
          (cmd) =>
            query === '' ||
            cmd.label.toLowerCase().includes(query.toLowerCase())
        ).length
        updateSlashMenuPosition(id, commandCount)
      })
    } else {
      closeSlashMenu()
    }

    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content } : b)))
    if (!slashMenuActiveRef.current) {
      scheduleBlockSave()
    }
  }

  const applyFormatToFocusedBlock = useCallback(
    (format: InlineFormat) => {
      const blockId = focusedBlockId
      const editor = getFocusedEditor()
      if (!blockId || !editor) {
        showToast('서식을 적용할 블록을 먼저 선택하세요.')
        return
      }

      if (editor instanceof HTMLTextAreaElement) {
        showToast('코드 블록에는 인라인 서식을 적용할 수 없습니다.')
        return
      }

      let linkUrl: string | undefined
      if (format === 'link') {
        const url = window.prompt('링크 URL을 입력하세요', 'https://')
        if (url === null) return
        linkUrl = url
      }

      editor.focus()
      applyRichTextFormat(format, linkUrl)
      updateBlock(blockId, sanitizeBlockHtml(editor.innerHTML))
    },
    [focusedBlockId, getFocusedEditor, showToast]
  )

  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const editor = getFocusedEditor()
      if (!editor || editor instanceof HTMLTextAreaElement) return
      if (document.activeElement !== editor) return

      const key = e.key.toLowerCase()
      if (key === 'b') {
        e.preventDefault()
        applyFormatToFocusedBlock('bold')
      } else if (key === 'i') {
        e.preventDefault()
        applyFormatToFocusedBlock('italic')
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [applyFormatToFocusedBlock, getFocusedEditor])

  const handleKeyDown = (e: React.KeyboardEvent, blockId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      closeSlashMenu()
      addBlock(blockId)
    } else if (e.key === 'Backspace') {
      const block = blocks.find((b) => b.id === blockId)
      if (block && isEmptyBlockContent(block.content)) {
        e.preventDefault()
        deleteBlock(blockId)
      }
    } else if (e.key === 'Escape') {
      if (slashMenuActiveRef.current) {
        e.preventDefault()
        closeSlashMenu()
        scheduleBlockSave()
      }
    }
  }

  const applySlashCommand = (type: BlockType, blockId: string) => {
    const block = blocksRef.current.find((b) => b.id === blockId)
    if (!block) return

    const editor = editorRefs.current[blockId]
    const rawContent =
      editor instanceof HTMLDivElement
        ? editor.innerHTML
        : editor instanceof HTMLTextAreaElement
          ? editor.value
          : block.content

    const plainText =
      editor instanceof HTMLTextAreaElement
        ? rawContent
        : getPlainTextFromHtml(rawContent)

    const slashIdx = plainText.lastIndexOf('/')
    const nextPlain = slashIdx >= 0 ? plainText.slice(0, slashIdx) : plainText
    const nextContent =
      type === 'code'
        ? nextPlain
        : type === 'divider'
          ? ''
          : plainTextToHtml(nextPlain)

    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, type, content: nextContent } : b
      )
    )
    closeSlashMenu()
    scheduleBlockSave()
    setTimeout(() => editorRefs.current[blockId]?.focus(), 50)
  }

  const filteredCommands = SLASH_COMMANDS.filter(
    (cmd) =>
      slashMenuQuery === '' ||
      cmd.label.toLowerCase().includes(slashMenuQuery.toLowerCase())
  )

  useEffect(() => {
    if (!showSlashMenu || !focusedBlockId) return

    const update = () => {
      updateSlashMenuPosition(focusedBlockId, filteredCommands.length)
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [showSlashMenu, focusedBlockId, filteredCommands.length, updateSlashMenuPosition])

  const saveStatusLabel = {
    idle: '',
    saving: '저장 중...',
    saved: '저장됨',
    error: '저장 실패',
  }[saveStatus]

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        불러오는 중...
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {toastMessage && (
        <div className="absolute right-4 top-14 z-50 rounded-md border border-border bg-popover px-3 py-2 text-xs text-foreground shadow-lg">
          {toastMessage}
        </div>
      )}
      <header className="flex h-11 shrink-0 items-center justify-between px-4 border-b border-border">
        <nav className="flex items-center gap-1 text-[13px] text-muted-foreground" aria-label="breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.id} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3" />}
              <button
                type="button"
                className="hover:text-foreground transition-colors"
                onClick={() => onSelectPage?.(crumb.id)}
              >
                {crumb.emoji && <span className="mr-1">{crumb.emoji}</span>}
                {crumb.title || '제목 없음'}
              </button>
            </span>
          ))}
          {breadcrumbs.length > 0 && <ChevronRight className="size-3" />}
          <span className="text-foreground font-medium">
            {page.emoji && <span className="mr-1">{page.emoji}</span>}
            {page.title || '제목 없음'}
          </span>
        </nav>

        <div className="flex items-center gap-2">
          {saveStatusLabel && (
            <span
              className={cn(
                'text-xs',
                saveStatus === 'error' ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              {saveStatusLabel}
            </span>
          )}
          <div className="flex items-center gap-1">
            <ToolbarIconButton
              label="굵게 (⌘B)"
              onClick={() => applyFormatToFocusedBlock('bold')}
            >
              <Bold className="size-[15px]" />
            </ToolbarIconButton>
            <ToolbarIconButton
              label="기울임 (⌘I)"
              onClick={() => applyFormatToFocusedBlock('italic')}
            >
              <Italic className="size-[15px]" />
            </ToolbarIconButton>
            <ToolbarIconButton
              label="취소선"
              onClick={() => applyFormatToFocusedBlock('strikethrough')}
            >
              <Strikethrough className="size-[15px]" />
            </ToolbarIconButton>
            <ToolbarIconButton
              label="코드"
              onClick={() => applyFormatToFocusedBlock('code')}
            >
              <Code2 className="size-[15px]" />
            </ToolbarIconButton>
            <ToolbarIconButton
              label="링크"
              onClick={() => applyFormatToFocusedBlock('link')}
            >
              <Link className="size-[15px]" />
            </ToolbarIconButton>
            <div className="mx-1 h-4 w-px bg-border" />
            <ToolbarIconButton
              label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기에 추가'}
              onClick={() => {
                const wasFavorite = isFavorite
                void onToggleFavorite?.(page.id)
                  ?.then(() => {
                    showToast(
                      wasFavorite
                        ? '즐겨찾기에서 제거했습니다.'
                        : '즐겨찾기에 추가했습니다.'
                    )
                  })
                  .catch(() => {
                    showToast('즐겨찾기 변경에 실패했습니다.')
                  })
              }}
              active={isFavorite}
            >
              <Star className={cn('size-[15px]', isFavorite && 'fill-current')} />
            </ToolbarIconButton>
            <button
              type="button"
              onClick={() => void handleShare()}
              className="flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Share className="size-[13px]" />
              공유
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="flex size-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    aria-label="더 보기"
                  />
                }
              >
                <MoreHorizontal className="size-[15px]" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 text-sm">
                <DropdownMenuItem onClick={() => void handleExport()}>
                  페이지보내기
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDuplicatePage && void onDuplicatePage(page.id)}
                >
                  페이지 복제
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDeletePage && void onDeletePage(page.id)}
                >
                  페이지 삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] px-[96px] pb-40">
          <div className="pt-16" />

          <div className="relative mb-2 flex items-start">
            <button
              type="button"
              className="text-5xl leading-none hover:opacity-75 transition-opacity cursor-pointer"
              onClick={() => setShowEmojiPicker((v) => !v)}
              aria-label="이모지 변경"
            >
              {page.emoji ?? '📄'}
            </button>
            {showEmojiPicker && (
              <div className="absolute top-14 left-0 z-50 grid grid-cols-5 gap-1 rounded-lg border border-border bg-popover p-2 shadow-lg">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className="text-xl hover:bg-accent rounded-sm p-1 transition-colors"
                    onClick={() => {
                      void onUpdateEmoji(page.id, e)
                      setShowEmojiPicker(false)
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="group mb-4">
            <textarea
              value={localTitle}
              onChange={(e) => {
                const title = e.target.value
                setLocalTitle(title)
                scheduleTitleSave(title)
                e.target.style.height = 'auto'
                e.target.style.height = `${e.target.scrollHeight}px`
              }}
              placeholder="제목 없음"
              rows={1}
              className="w-full resize-none overflow-hidden bg-transparent text-[2.5rem] font-bold leading-tight text-foreground placeholder:text-muted-foreground/30 outline-none"
              aria-label="페이지 제목"
            />
          </div>

          <div className="relative">
            {blocks.map((block) => (
              <BlockComponent
                key={block.id}
                block={block}
                onUpdate={(content) => updateBlock(block.id, content)}
                onFocus={() => setFocusedBlockId(block.id)}
                onKeyDown={(e) => handleKeyDown(e, block.id)}
                setEditorRef={getOrCreateRef(block.id)}
                isFocused={focusedBlockId === block.id}
              />
            ))}

            {showSlashMenu && filteredCommands.length > 0 && (
              <div
                className="fixed z-50 w-72 max-h-80 overflow-y-auto rounded-lg border border-border bg-popover shadow-xl"
                style={{ top: slashMenuPos.top, left: slashMenuPos.left }}
              >
                <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  기본 블록
                </div>
                {filteredCommands.map((cmd) => {
                  const Icon = cmd.icon
                  return (
                    <button
                      key={cmd.type}
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                      onClick={() => {
                        if (focusedBlockId) {
                          applySlashCommand(cmd.type, focusedBlockId)
                        }
                      }}
                    >
                      <span className="flex size-8 items-center justify-center rounded-md border border-border bg-background text-foreground/80">
                        <Icon className="size-4" />
                      </span>
                      <span className="flex flex-col">
                        <span className="font-medium text-foreground">{cmd.label}</span>
                        <span className="text-[12px] text-muted-foreground">{cmd.description}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            className="mt-1 w-full cursor-text py-2 text-left text-[15px] text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors"
            onClick={() => addBlock(blocks[blocks.length - 1]?.id)}
          >
            클릭하여 새 블록 추가...
          </button>
        </div>
      </main>
    </div>
  )
}
