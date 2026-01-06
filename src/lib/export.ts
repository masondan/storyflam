import type { Story, ContentBlock } from './types'

export function exportToTxt(story: Story): void {
  let content = `${story.title}\n`
  content += `By ${story.author_name}\n`
  content += `${'='.repeat(40)}\n\n`

  if (story.summary) {
    content += `${story.summary}\n\n`
  }

  if (story.content?.blocks) {
    story.content.blocks.forEach(block => {
      content += blockToText(block)
    })
  }

  downloadFile(content, `${slugify(story.title)}.txt`, 'text/plain')
}

export async function exportToPdf(story: Story): Promise<void> {
  const { jsPDF } = await import('jspdf')
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  const maxImageWidth = 150 // mm
  let y = margin

  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  const titleLines = doc.splitTextToSize(story.title, contentWidth)
  doc.text(titleLines, margin, y)
  y += titleLines.length * 10 + 5

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`By ${story.author_name}`, margin, y)
  y += 10

  doc.setDrawColor(200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 10

  doc.setTextColor(0)

  if (story.summary) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'italic')
    const summaryLines = doc.splitTextToSize(story.summary, contentWidth)
    doc.text(summaryLines, margin, y)
    y += summaryLines.length * 6 + 8
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)

  if (story.content?.blocks) {
    for (const block of story.content.blocks) {
      if (y > 270) {
        doc.addPage()
        y = margin
      }

      // Handle image blocks specially
      if (block.type === 'image' && block.url) {
        try {
          const { imageData, width, height } = await fetchAndEncodeImage(block.url)
          const imgHeight = (height / width) * maxImageWidth
          
          if (y + imgHeight > 270) {
            doc.addPage()
            y = margin
          }
          
          const imgX = (pageWidth - maxImageWidth) / 2
          doc.addImage(imageData, 'JPEG', imgX, y, maxImageWidth, imgHeight)
          y += imgHeight + 10

          if (block.caption) {
            doc.setFontSize(9)
            doc.setTextColor(100)
            const captionLines = doc.splitTextToSize(block.caption, contentWidth)
            doc.text(captionLines, margin, y)
            y += captionLines.length * 4 + 8
            doc.setTextColor(0)
            doc.setFontSize(11)
          }
          continue
        } catch (error) {
          console.error('Failed to embed image:', error)
          // Fall through to text representation
        }
      }

      const text = blockToText(block).trim()
      if (!text) continue

      if (block.type === 'heading') {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
      } else if (block.type === 'bold') {
        doc.setFont('helvetica', 'bold')
      } else {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'normal')
      }

      if (block.type === 'separator') {
        doc.setDrawColor(150)
        const centerX = pageWidth / 2
        doc.line(centerX - 30, y, centerX + 30, y)
        y += 8
      } else {
        const lines = doc.splitTextToSize(text, contentWidth)
        doc.text(lines, margin, y)
        y += lines.length * 6 + 4
      }
    }
  }

  doc.save(`${slugify(story.title)}.pdf`)
}

/**
 * Fetches an image from a URL and encodes it as Base64 for PDF embedding
 */
async function fetchAndEncodeImage(
  imageUrl: string
): Promise<{ imageData: string; width: number; height: number }> {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`)
  }

  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      // Extract dimensions from image metadata or use defaults
      const img = new Image()
      img.onload = () => {
        resolve({
          imageData: base64,
          width: img.width,
          height: img.height
        })
      }
      img.onerror = () => {
        reject(new Error('Failed to load image dimensions'))
      }
      img.src = base64
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(blob)
  })
}

function blockToText(block: ContentBlock): string {
  switch (block.type) {
    case 'paragraph':
      return `${block.text}\n\n`
    case 'heading':
      return `\n## ${block.text}\n\n`
    case 'bold':
      return `**${block.text}**\n\n`
    case 'separator':
      return `\n---\n\n`
    case 'list':
      if (block.items) {
        return block.items.map((item, i) => 
          block.listType === 'ordered' ? `${i + 1}. ${item}` : `• ${item}`
        ).join('\n') + '\n\n'
      }
      return ''
    case 'image':
      // Images are now embedded; this is only used as fallback
      return block.caption ? `[Image: ${block.caption}]\n\n` : ''
    case 'youtube':
      return `[YouTube: ${block.url}]\n\n`
    case 'link':
      return `${block.text} (${block.url})\n\n`
    default:
      return ''
  }
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
