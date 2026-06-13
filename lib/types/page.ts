export interface NotionPage {
  id: string
  title: string
  emoji?: string
  children?: NotionPage[]
  isExpanded?: boolean
  isFavorite?: boolean
  updatedAt?: string
}

export type BlockType =
  | 'text'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulletList'
  | 'numberedList'
  | 'quote'
  | 'code'
  | 'divider'

export interface NotionBlock {
  id: string
  type: BlockType
  content: string
  sortOrder: number
}
