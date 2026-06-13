export type InlineFormat = 'bold' | 'italic' | 'strikethrough' | 'code' | 'link'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function isHtmlContent(content: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(content)
}

export function plainTextToHtml(text: string): string {
  if (!text) return ''
  return escapeHtml(text).replace(/\n/g, '<br>')
}

export function normalizeBlockContent(content: string): string {
  if (!content) return ''
  if (isHtmlContent(content)) return content
  return plainTextToHtml(content)
}

export function getPlainTextFromHtml(html: string): string {
  if (typeof document === 'undefined') return html
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent ?? ''
}

export function isEmptyBlockContent(content: string): boolean {
  if (!content || content === '<br>' || content === '<div><br></div>') {
    return true
  }
  return getPlainTextFromHtml(content).trim() === ''
}

export function applyRichTextFormat(
  format: InlineFormat,
  linkUrl?: string
): boolean {
  if (typeof document === 'undefined') return false

  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return false

  if (format === 'link') {
    const url = linkUrl?.trim() || 'https://'
    return document.execCommand('createLink', false, url)
  }

  if (format === 'code') {
    const selectedText = selection.toString() || '코드'
    return document.execCommand(
      'insertHTML',
      false,
      `<code>${escapeHtml(selectedText)}</code>`
    )
  }

  const commandMap: Record<
    Exclude<InlineFormat, 'link' | 'code'>,
    string
  > = {
    bold: 'bold',
    italic: 'italic',
    strikethrough: 'strikeThrough',
  }

  return document.execCommand(commandMap[format], false)
}

function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ''
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const el = node as HTMLElement
  const childMarkdown = Array.from(el.childNodes).map(nodeToMarkdown).join('')

  switch (el.tagName) {
    case 'STRONG':
    case 'B':
      return `**${childMarkdown}**`
    case 'EM':
    case 'I':
      return `*${childMarkdown}*`
    case 'S':
    case 'STRIKE':
    case 'DEL':
      return `~~${childMarkdown}~~`
    case 'CODE':
      return `\`${childMarkdown}\``
    case 'A': {
      const href = el.getAttribute('href') ?? ''
      return `[${childMarkdown}](${href})`
    }
    case 'BR':
      return '\n'
    case 'DIV':
    case 'P':
      return childMarkdown + '\n'
    default:
      return childMarkdown
  }
}

export function htmlToMarkdown(html: string): string {
  if (!html) return ''
  if (!isHtmlContent(html)) return html

  if (typeof document === 'undefined') return getPlainTextFromHtml(html)

  const div = document.createElement('div')
  div.innerHTML = html
  return nodeToMarkdown(div).replace(/\n{3,}/g, '\n\n').trim()
}

export function blocksToMarkdown(
  title: string,
  blocks: Array<{ type: string; content: string }>
): string {
  const lines = [`# ${title || '제목 없음'}`, '']

  for (const block of blocks) {
    const text = htmlToMarkdown(block.content)

    switch (block.type) {
      case 'heading1':
        lines.push(`# ${text}`)
        break
      case 'heading2':
        lines.push(`## ${text}`)
        break
      case 'heading3':
        lines.push(`### ${text}`)
        break
      case 'bulletList':
        lines.push(`- ${text}`)
        break
      case 'numberedList':
        lines.push(`1. ${text}`)
        break
      case 'quote':
        lines.push(`> ${text}`)
        break
      case 'code':
        lines.push('```', text, '```')
        break
      case 'divider':
        lines.push('---')
        break
      default:
        lines.push(text)
    }
    lines.push('')
  }

  return lines.join('\n').trim()
}
