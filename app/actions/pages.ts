'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireSessionUser } from '@/lib/auth'
import { pageRepository } from '@/lib/repositories/page-repository'
import type { NotionPage } from '@/lib/types/page'

export async function getPagesTree(): Promise<NotionPage[]> {
  const { id: userId } = await requireSessionUser()
  return pageRepository.findTreeByUserId(userId)
}

export async function getPagesFlat(): Promise<NotionPage[]> {
  const { id: userId } = await requireSessionUser()
  return pageRepository.findFlatByUserId(userId)
}

export async function createPageAction(parentId?: string) {
  const { id: userId } = await requireSessionUser()
  const page = await pageRepository.create(userId, { parentId })
  revalidatePath('/')
  return { id: page.id }
}

const updatePageSchema = z.object({
  title: z.string().optional(),
  emoji: z.string().nullable().optional(),
  isExpanded: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
})

export async function updatePageAction(
  pageId: string,
  data: z.infer<typeof updatePageSchema>
) {
  const { id: userId } = await requireSessionUser()
  const parsed = updatePageSchema.parse(data)
  await pageRepository.update(pageId, userId, parsed)
  revalidatePath('/')
}

export async function deletePageAction(pageId: string) {
  const { id: userId } = await requireSessionUser()
  await pageRepository.delete(pageId, userId)
  revalidatePath('/')
}

export async function duplicatePageAction(pageId: string) {
  const { id: userId } = await requireSessionUser()
  const page = await pageRepository.duplicate(pageId, userId)
  revalidatePath('/')
  return { id: page.id }
}

export async function toggleFavoriteAction(pageId: string) {
  const { id: userId } = await requireSessionUser()
  const page = await pageRepository.findByIdForUser(pageId, userId)
  if (!page) {
    throw new Error('페이지를 찾을 수 없습니다.')
  }

  const updated = await pageRepository.update(pageId, userId, {
    isFavorite: !page.is_favorite,
  })
  return { isFavorite: updated.is_favorite }
}
