import type { NotionPage } from '@/lib/types/page'

export interface DbPage {
  id: string
  user_id: string
  title: string
  emoji: string | null
  parent_id: string | null
  is_expanded: boolean
  is_favorite: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

type PageWithChildren = DbPage & { children?: PageWithChildren[] }

export function buildPageTree(pages: DbPage[]): NotionPage[] {
  const pageMap = new Map<string, PageWithChildren>()
  const roots: PageWithChildren[] = []

  for (const page of pages) {
    pageMap.set(page.id, { ...page, children: [] })
  }

  for (const page of pages) {
    const node = pageMap.get(page.id)!
    if (page.parent_id && pageMap.has(page.parent_id)) {
      pageMap.get(page.parent_id)!.children!.push(node)
    } else if (!page.parent_id) {
      roots.push(node)
    }
  }

  const sortNodes = (nodes: PageWithChildren[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order)
    for (const node of nodes) {
      if (node.children?.length) sortNodes(node.children)
    }
  }

  sortNodes(roots)

  const toNotionPage = (node: PageWithChildren): NotionPage => ({
    id: node.id,
    title: node.title,
    emoji: node.emoji ?? undefined,
    isExpanded: node.is_expanded,
    isFavorite: node.is_favorite,
    updatedAt: node.updated_at,
    children: node.children?.length
      ? node.children.map(toNotionPage)
      : undefined,
  })

  return roots.map(toNotionPage)
}

export function flattenPageTree(pages: NotionPage[]): NotionPage[] {
  const result: NotionPage[] = []
  for (const page of pages) {
    result.push(page)
    if (page.children?.length) {
      result.push(...flattenPageTree(page.children))
    }
  }
  return result
}
