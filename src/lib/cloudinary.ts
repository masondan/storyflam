const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024 // 10MB client limit
const COMPRESSED_IMAGE_MAX = 5 * 1024 * 1024 // 5MB after compression

export interface UploadResult {
  url: string
  width: number
  height: number
  publicId: string
  error?: string
}

/**
 * Compress image using Canvas API
 * Converts to JPEG at 75% quality, maintains dimensions
 */
export async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0)

        // Convert to JPEG at 75% quality
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Could not compress image'))
              return
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })
            resolve(compressedFile)
          },
          'image/jpeg',
          0.75
        )
      }

      img.onerror = () => {
        reject(new Error('Could not load image'))
      }

      img.src = e.target?.result as string
    }

    reader.onerror = () => {
      reject(new Error('Could not read file'))
    }

    reader.readAsDataURL(file)
  })
}

export { MAX_IMAGE_FILE_SIZE, COMPRESSED_IMAGE_MAX }

export async function uploadImage(file: File): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', 'storyflam/images')

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    )

    if (!response.ok) {
      return { url: '', width: 0, height: 0, publicId: '', error: 'Failed to upload image' }
    }

    const data = await response.json()
    
    return {
      url: data.secure_url,
      width: data.width,
      height: data.height,
      publicId: data.public_id
    }
  } catch (err) {
    console.error('Upload error:', err)
    return { url: '', width: 0, height: 0, publicId: '', error: 'Upload failed' }
  }
}

export function getOptimizedUrl(url: string, width: number = 800): string {
  if (!url.includes('cloudinary.com')) return url
  return url.replace('/upload/', `/upload/w_${width},q_auto,f_auto/`)
}

export function getThumbnailUrl(url: string, size: number = 300): string {
  if (!url.includes('cloudinary.com')) return url
  return url.replace('/upload/', `/upload/w_${size},h_${size},c_fill,q_auto,f_auto/`)
}

export async function uploadVideo(file: File): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', 'storyflam/videos')

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
      { method: 'POST', body: formData }
    )

    if (!response.ok) {
      return { url: '', width: 0, height: 0, publicId: '', error: 'Failed to upload video' }
    }

    const data = await response.json()

    return {
      url: data.secure_url,
      width: data.width,
      height: data.height,
      publicId: data.public_id
    }
  } catch (err) {
    console.error('Upload error:', err)
    return { url: '', width: 0, height: 0, publicId: '', error: 'Upload failed' }
  }
}

export function getOptimizedVideoUrl(url: string): string {
  if (!url.includes('cloudinary.com')) return url
  return url.replace('/upload/', '/upload/h_1280,c_limit,q_auto,f_auto/')
}
