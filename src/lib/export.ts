import type { Story } from './types'
import { isHtmlContent } from './types'
import { contentToPlainText } from './content'

export function exportToTxt(story: Story): void {
  let content = `${story.title}\n`
  content += `By ${story.author_name}\n`
  content += `${'='.repeat(40)}\n\n`

  if (story.summary) {
    content += `${story.summary}\n\n`
  }

  if (story.content) {
    if (isHtmlContent(story.content)) {
      content += contentToPlainText(story.content)
    } else if ('blocks' in story.content) {
      // Legacy block format
      content += contentToPlainText(story.content)
    }
  }

  downloadFile(content, `${slugify(story.title)}.txt`, 'text/plain')
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
