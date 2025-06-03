// src/utils/index.ts

import JSZip from 'jszip'

export const downloadImage = (url: string, filename: string) => {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const downloadImagesAsZip = async (imageUrls: string[], zipFilename: string) => {
  const zip = new JSZip()
  
  // Fetch all images and add to zip
  const imagePromises = imageUrls.map(async (url, index) => {
    try {
      // Try to fetch with CORS mode first
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Cache-Control': 'no-cache',
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const blob = await response.blob()
      const filename = `image_${index + 1}.png`
      zip.file(filename, blob)
    } catch (error) {
      console.error(`Failed to download image ${index + 1}:`, error)
      
      // Fallback: try to download directly using a different approach
      try {
        // Create a canvas to convert the image
        const img = new Image()
        img.crossOrigin = 'anonymous'
        
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = url
        })
        
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = img.width
        canvas.height = img.height
        
        ctx?.drawImage(img, 0, 0)
        
        canvas.toBlob((blob) => {
          if (blob) {
            const filename = `image_${index + 1}.png`
            zip.file(filename, blob)
          }
        }, 'image/png')
      } catch (fallbackError) {
        console.error(`Fallback also failed for image ${index + 1}:`, fallbackError)
        // Skip this image if both methods fail
      }
    }
  })

  await Promise.all(imagePromises)

  // Check if any files were added to the zip
  const files = Object.keys(zip.files)
  if (files.length === 0) {
    throw new Error('No images could be downloaded due to CORS restrictions')
  }

  // Generate zip file and download
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const zipUrl = URL.createObjectURL(zipBlob)
  downloadImage(zipUrl, zipFilename)
  URL.revokeObjectURL(zipUrl)
}

export const generateUniqueFilename = (originalName: string, taskPrompt: string, index: number) => {
  const cleanPrompt = taskPrompt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')
  const extension = originalName.split('.').pop() || 'png'
  return `${cleanPrompt}_${index + 1}.${extension}`
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const validateImageFile = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const maxSize = 10 * 1024 * 1024 // 10MB
  
  if (!validTypes.includes(file.type)) {
    alert('Please upload a valid image file (JPEG, PNG, or WebP)')
    return false
  }
  
  if (file.size > maxSize) {
    alert('Image file size must be less than 10MB')
    return false
  }
  
  return true
}

export const createImagePreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const getTaskStatusColor = (status: string): string => {
  switch (status) {
    case 'idle':
      return 'text-gray-500'
    case 'pending':
      return 'text-yellow-500'
    case 'generating':
      return 'text-blue-500'
    case 'completed':
      return 'text-green-500'
    case 'failed':
      return 'text-red-500'
    default:
      return 'text-gray-500'
  }
}

export const getTaskStatusText = (status: string): string => {
  switch (status) {
    case 'idle':
      return '等待生成'
    case 'pending':
      return '队列中'
    case 'generating':
      return '生成中'
    case 'completed':
      return '生成完毕'
    case 'failed':
      return '生成失败'
    default:
      return '未知状态'
  }
}
