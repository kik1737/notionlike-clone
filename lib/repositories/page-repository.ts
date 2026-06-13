import { createClient } from '@/lib/supabase/server'
import { buildPageTree } from '@/lib/mappers/page-mapper'
import type { DbPage } from '@/lib/mappers/page-mapper'
import type { NotionPage } from '@/lib/types/page'

type ParentIdFilter = string | null | undefined

function applyParentIdFilter<
  T extends {
    eq: (column: string, value: string) => T
    is: (column: string, value: null) => T
  },
>(query: T, parentId: ParentIdFilter): T {
  if (parentId) {
    return query.eq('parent_id', parentId)
  }
  return query.is('parent_id', null)
}

export class PageRepository {
  private async getClient() {
    return createClient()
  }

  async findTreeByUserId(userId: string): Promise<NotionPage[]> {
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })

    if (error) throw new Error(error.message)
    return buildPageTree((data ?? []) as DbPage[])
  }

  async findByIdForUser(pageId: string, userId: string) {
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('id', pageId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data as DbPage | null
  }

  async findFlatByUserId(userId: string): Promise<NotionPage[]> {
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) throw new Error(error.message)

    return ((data ?? []) as DbPage[]).map((page) => ({
      id: page.id,
      title: page.title,
      emoji: page.emoji ?? undefined,
      isExpanded: page.is_expanded,
      isFavorite: page.is_favorite,
      updatedAt: page.updated_at,
    }))
  }

  async create(
    userId: string,
    data: { parentId?: string; title?: string; emoji?: string }
  ) {
    const supabase = await this.getClient()

    if (data.parentId) {
      const parent = await this.findByIdForUser(data.parentId, userId)
      if (!parent) {
        throw new Error('부모 페이지를 찾을 수 없습니다.')
      }

      const { error: expandError } = await supabase
        .from('pages')
        .update({ is_expanded: true })
        .eq('id', data.parentId)
        .eq('user_id', userId)

      if (expandError) throw new Error(expandError.message)
    }

    const countQuery = applyParentIdFilter(
      supabase
        .from('pages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      data.parentId
    )
    const { count, error: countError } = await countQuery

    if (countError) throw new Error(countError.message)

    const { data: page, error } = await supabase
      .from('pages')
      .insert({
        user_id: userId,
        parent_id: data.parentId ?? null,
        title: data.title ?? '',
        emoji: data.emoji ?? '📄',
        sort_order: count ?? 0,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return page as DbPage
  }

  async update(
    pageId: string,
    userId: string,
    data: Partial<{
      title: string
      emoji: string | null
      isExpanded: boolean
      isFavorite: boolean
    }>
  ) {
    const page = await this.findByIdForUser(pageId, userId)
    if (!page) {
      throw new Error('페이지를 찾을 수 없습니다.')
    }

    const supabase = await this.getClient()
    const updateData: Record<string, unknown> = {}

    if (data.title !== undefined) updateData.title = data.title
    if (data.emoji !== undefined) updateData.emoji = data.emoji
    if (data.isExpanded !== undefined) updateData.is_expanded = data.isExpanded
    if (data.isFavorite !== undefined) updateData.is_favorite = data.isFavorite

    const { data: updated, error } = await supabase
      .from('pages')
      .update(updateData)
      .eq('id', pageId)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return updated as DbPage
  }

  async delete(pageId: string, userId: string) {
    const page = await this.findByIdForUser(pageId, userId)
    if (!page) {
      throw new Error('페이지를 찾을 수 없습니다.')
    }

    const supabase = await this.getClient()
    const { error } = await supabase
      .from('pages')
      .delete()
      .eq('id', pageId)
      .eq('user_id', userId)

    if (error) throw new Error(error.message)
  }

  async duplicate(pageId: string, userId: string) {
    const supabase = await this.getClient()

    const page = await this.findByIdForUser(pageId, userId)
    if (!page) {
      throw new Error('페이지를 찾을 수 없습니다.')
    }

    const { data: blocks, error: blocksError } = await supabase
      .from('blocks')
      .select('type, content, sort_order')
      .eq('page_id', pageId)
      .order('sort_order', { ascending: true })

    if (blocksError) throw new Error(blocksError.message)

    const duplicateCountQuery = applyParentIdFilter(
      supabase
        .from('pages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      page.parent_id
    )
    const { count, error: countError } = await duplicateCountQuery

    if (countError) throw new Error(countError.message)

    const { data: newPage, error: pageError } = await supabase
      .from('pages')
      .insert({
        user_id: userId,
        parent_id: page.parent_id,
        title: `${page.title} (사본)`,
        emoji: page.emoji,
        sort_order: count ?? 0,
      })
      .select('*')
      .single()

    if (pageError) throw new Error(pageError.message)

    if (blocks && blocks.length > 0) {
      const { error: insertBlocksError } = await supabase.from('blocks').insert(
        blocks.map((block) => ({
          page_id: newPage.id,
          type: block.type,
          content: block.content,
          sort_order: block.sort_order,
        }))
      )

      if (insertBlocksError) throw new Error(insertBlocksError.message)
    }

    return newPage as DbPage
  }
}

export const pageRepository = new PageRepository()
