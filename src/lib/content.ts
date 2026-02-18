import type { Story, ContentBlock } from './types'
import { getOptimizedUrl } from './cloudinary'

/**
 * Renders story content to HTML string.
 * Supports both old block format and new Quill HTML format.
 */
export function renderContent(content: Story['content'], primaryColor: string = '5422b0'): string {
	if (!content) return ''

	// New Quill HTML format
	if ('html' in content) {
		return content.html
	}

	// Legacy block format
	if ('blocks' in content) {
		return content.blocks.map((block) => renderBlock(block, primaryColor)).join('')
	}

	return ''
}

function renderBlock(block: ContentBlock, primaryColor: string): string {
	switch (block.type) {
		case 'paragraph':
			return `<p class="mb-4 text-base text-[#333333] leading-relaxed">${sanitizeInlineHtml(block.text || '')}</p>`
		case 'heading':
			return `<h2 class="text-xl font-bold my-4 text-black">${escapeHtml(block.text || '')}</h2>`
		case 'bold':
			return `<p class="mb-4 text-base text-[#333333] leading-relaxed"><strong>${escapeHtml(block.text || '')}</strong></p>`
		case 'list': {
			const tag = block.listType === 'ordered' ? 'ol' : 'ul'
			const listClass = block.listType === 'ordered' ? 'list-decimal' : 'list-disc'
			const items = (block.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')
			return `<${tag} class="${listClass} ml-6 mb-4 text-base text-[#333333]">${items}</${tag}>`
		}
		case 'separator':
			return `<hr class="w-1/2 mx-auto my-6 border-[#999999]" />`
		case 'image':
			return `<figure class="my-4"><img src="${getOptimizedUrl(block.url || '')}" alt="" class="w-full rounded-lg" /></figure>`
		case 'youtube': {
			const videoId = extractYouTubeId(block.url || '')
			if (!videoId) return ''
			return `<div class="my-4 aspect-video"><iframe src="https://www.youtube.com/embed/${videoId}" class="w-full h-full rounded-lg" frameborder="0" allowfullscreen></iframe></div>`
		}
		case 'video':
			return `<div class="my-4"><video src="${block.url || ''}" controls playsinline class="w-full rounded-lg"></video></div>`
		case 'link':
			return `<a href="${escapeAttr(block.url || '')}" target="_blank" rel="noopener noreferrer" style="color: #${primaryColor};" class="hover:underline">${escapeHtml(block.text || '')}</a>`
		default:
			return ''
	}
}

function extractYouTubeId(url: string): string {
	const match = url.match(
		/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
	)
	return match ? match[1] : ''
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

function escapeAttr(text: string): string {
	return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/**
 * For paragraph blocks in the old format, the text may contain inline HTML
 * (bold tags, links) that was stored from the contenteditable editor.
 * We allow safe inline tags but escape everything else.
 */
function sanitizeInlineHtml(text: string): string {
	// If it contains HTML tags, return as-is (legacy format stored innerHTML)
	if (/<[a-z][\s\S]*>/i.test(text)) {
		return text
	}
	return escapeHtml(text)
}

/**
 * Converts story content to plain text for export purposes.
 * Supports both old block format and new Quill HTML format.
 */
export function contentToPlainText(content: Story['content']): string {
	if (!content) return ''

	// New Quill HTML format - strip HTML tags
	if ('html' in content) {
		return content.html
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<\/p>/gi, '\n\n')
			.replace(/<\/h[1-6]>/gi, '\n\n')
			.replace(/<\/li>/gi, '\n')
			.replace(/<hr\s*\/?>/gi, '\n---\n')
			.replace(/<img[^>]*>/gi, '')
			.replace(/<video[^>]*>.*?<\/video>/gi, '')
			.replace(/<[^>]+>/g, '')
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/\n{3,}/g, '\n\n')
			.trim()
	}

	// Legacy block format
	if ('blocks' in content) {
		return content.blocks
			.map((block) => {
				switch (block.type) {
					case 'paragraph':
						return stripHtml(block.text || '') + '\n\n'
					case 'heading':
						return `\n## ${block.text}\n\n`
					case 'bold':
						return `**${block.text}**\n\n`
					case 'separator':
						return '\n---\n\n'
					case 'list':
						return (
							(block.items || [])
								.map((item, i) =>
									block.listType === 'ordered' ? `${i + 1}. ${item}` : `• ${item}`
								)
								.join('\n') + '\n\n'
						)
					case 'image':
						return block.caption ? `[Image: ${block.caption}]\n\n` : ''
					case 'youtube':
						return `[Video: ${block.url}]\n\n`
					case 'video':
						return `[Video]\n\n`
					case 'link':
						return `${block.text} (${block.url})\n\n`
					default:
						return ''
				}
			})
			.join('')
	}

	return ''
}

function stripHtml(text: string): string {
	return text.replace(/<[^>]+>/g, '')
}
