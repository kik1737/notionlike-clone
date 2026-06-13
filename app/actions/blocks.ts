'use server'

import { z } from 'zod'
import { requireSessionUser } from '@/lib/auth'
import { blockRepository } from '@/lib/repositories/block-repository'
import type { BlockType, NotionBlock } from '@/lib/types/page'

const blockInputSchema = z.object({
  id: z.string().optional(),
  type: z.enum([
    'text',
    'heading1',
    'heading2',
    'heading3',
    'bulletList',
    'numberedList',
    'quote',
    'code',
    'divider',
  ]),
  content: z.string(),
  sortOrder: z.number().int().min(0),
})

export async function getBlocksAction(pageId: string): Promise<NotionBlock[]> {
  const { id: userId } = await requireSessionUser()
  return blockRepository.findByPageId(pageId, userId)
}

export async function saveBlocksAction(
  pageId: string,
  blocks: Array<z.infer<typeof blockInputSchema>>
): Promise<NotionBlock[]> {
  const { id: userId } = await requireSessionUser()
  const parsed = z.array(blockInputSchema).parse(blocks)
  return blockRepository.saveMany(pageId, userId, parsed)
}
