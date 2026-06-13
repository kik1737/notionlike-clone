import { createClient } from '@/lib/supabase/server'
import { pageRepository } from '@/lib/repositories/page-repository'
import type { BlockType, NotionBlock } from '@/lib/types/page'

interface DbBlock {
  id: string
  page_id: string
  type: string
  content: string
  sort_order: number
}

export class BlockRepository {
  private async getClient() {
    return createClient()
  }

  async findByPageId(pageId: string, userId: string): Promise<NotionBlock[]> {
    const page = await pageRepository.findByIdForUser(pageId, userId)
    if (!page) {
      throw new Error('페이지를 찾을 수 없습니다.')
    }

    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('blocks')
      .select('*')
      .eq('page_id', pageId)
      .order('sort_order', { ascending: true })

    if (error) throw new Error(error.message)

    return ((data ?? []) as DbBlock[]).map((block) => ({
      id: block.id,
      type: block.type as BlockType,
      content: block.content,
      sortOrder: block.sort_order,
    }))
  }

  async saveMany(
    pageId: string,
    userId: string,
    blocks: Array<{ id?: string; type: BlockType; content: string; sortOrder: number }>
  ): Promise<NotionBlock[]> {
    const page = await pageRepository.findByIdForUser(pageId, userId)
    if (!page) {
      throw new Error('페이지를 찾을 수 없습니다.')
    }

    const supabase = await this.getClient()
    const payload = blocks.map((block) => ({
      id: block.id ?? null,
      type: block.type,
      content: block.content,
      sort_order: block.sortOrder,
    }))

    const { error } = await supabase.rpc('sync_page_blocks', {
      p_page_id: pageId,
      p_blocks: payload,
    })

    if (error) throw new Error(error.message)

    return this.findByPageId(pageId, userId)
  }
}

export const blockRepository = new BlockRepository()
