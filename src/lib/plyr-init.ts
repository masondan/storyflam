/**
 * Plyr initialization helper for video elements.
 * Dynamically imports Plyr and initializes it on all <video> elements
 * within a scoped container. Returns a cleanup function to destroy instances.
 */

let PlyrConstructor: any = null

async function ensurePlyr() {
	if (!PlyrConstructor) {
		const mod = await import('plyr')
		PlyrConstructor = mod.default
	}
	return PlyrConstructor
}

/**
 * Initialize Plyr on all video elements within the given container.
 * Returns a cleanup function that destroys all created Plyr instances.
 */
export async function initPlyrInContainer(container: HTMLElement): Promise<() => void> {
	const Plyr = await ensurePlyr()
	const instances: any[] = []

	const videos = container.querySelectorAll('video')
	videos.forEach((video) => {
		// Skip if already initialized
		if (video.closest('.plyr--video')) return
		
		// Skip placeholder videos (those still loading)
		const wrapper = video.closest('[data-video-url]')
		if (wrapper && wrapper.getAttribute('data-video-url')?.startsWith('video-placeholder-')) return

		try {
			const player = new Plyr(video, {
				controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen']
			})
			instances.push(player)
			
			// Hide Plyr controls until video is ready to play
			const plyrWrapper = video.closest('.plyr')
			if (plyrWrapper) {
				plyrWrapper.style.opacity = '0'
				plyrWrapper.style.pointerEvents = 'none'
			}
			
			// Wait for video to be loadable, then show Plyr with fade-in
			const onCanPlay = () => {
				video.style.pointerEvents = 'auto'
				video.classList.remove('opacity-0')
				video.classList.add('animate-fade-in')
				if (plyrWrapper) {
					plyrWrapper.style.opacity = '1'
					plyrWrapper.style.pointerEvents = 'auto'
				}
				video.removeEventListener('canplay', onCanPlay)
			}
			
			video.addEventListener('canplay', onCanPlay)
			// Also handle the case where video source fails to load
			video.addEventListener('error', onCanPlay, { once: true })
		} catch (err) {
			console.error('[Plyr] Failed to initialize:', err)
		}
	})

	return () => {
		instances.forEach((p) => {
			try { p.destroy() } catch {}
		})
	}
}

/**
 * Strip Plyr DOM wrappers from a container, restoring raw <video> elements.
 * Call this before serializing editor HTML to prevent saving Plyr markup.
 */
export function stripPlyrMarkup(html: string): string {
	// Plyr wraps videos in .plyr containers — strip them, keep the <video>
	const div = document.createElement('div')
	div.innerHTML = html

	div.querySelectorAll('.plyr--video').forEach((plyrWrapper) => {
		const video = plyrWrapper.querySelector('video')
		if (video) {
			// Remove Plyr-added attributes
			video.removeAttribute('tabindex')
			// Replace the entire Plyr wrapper with just the clean video-wrapper div
			const parent = plyrWrapper.closest('.ql-video-wrapper')
			if (parent) {
				parent.innerHTML = ''
				parent.appendChild(video)
			} else {
				plyrWrapper.replaceWith(video)
			}
		}
	})

	return div.innerHTML
}
